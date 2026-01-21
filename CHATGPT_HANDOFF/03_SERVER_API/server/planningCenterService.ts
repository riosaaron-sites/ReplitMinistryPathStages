import { storage } from "./storage";
import type { PlanningCenterCredentials } from "@shared/schema";

const PC_BASE_URL = "https://api.planningcenteronline.com";

interface PCServiceType {
  id: string;
  type: string;
  attributes: {
    name: string;
    sequence?: number;
    created_at: string;
    updated_at: string;
  };
}

interface PCPlan {
  id: string;
  type: string;
  attributes: {
    title: string;
    dates: string;
    sort_date: string;
    created_at: string;
    updated_at: string;
  };
}

interface PCTeamMember {
  id: string;
  type: string;
  attributes: {
    name: string;
    team_position_name: string;
    status: string;
    created_at: string;
    updated_at: string;
  };
  relationships?: {
    person?: {
      data?: {
        id: string;
        type: string;
      };
    };
    plan?: {
      data?: {
        id: string;
        type: string;
      };
    };
  };
}

interface PCSchedule {
  id: string;
  type: string;
  attributes: {
    notes?: string;
    status: string;
    decline_reason?: string;
    responds_to_name?: string;
    sort_date?: string;
    team_name?: string;
    team_position_name?: string;
    short_dates?: string;
  };
  relationships?: {
    person?: {
      data?: {
        id: string;
      };
    };
    service_type?: {
      data?: {
        id: string;
      };
    };
    plan?: {
      data?: {
        id: string;
      };
    };
  };
}

interface PCApiResponse<T> {
  data: T | T[];
  included?: unknown[];
  meta?: {
    total_count?: number;
    count?: number;
  };
  links?: {
    self: string;
    next?: string;
    prev?: string;
  };
}

export class PlanningCenterService {
  private credentials: PlanningCenterCredentials | null = null;

  private async getAuthHeader(): Promise<string | null> {
    if (!this.credentials) {
      const settings = await storage.getIntegrationSettings('planning-center');
      if (!settings?.isEnabled || !settings.credentials) {
        return null;
      }
      this.credentials = settings.credentials as PlanningCenterCredentials;
    }

    const { applicationId, secret } = this.credentials;
    const encoded = Buffer.from(`${applicationId}:${secret}`).toString('base64');
    return `Basic ${encoded}`;
  }

  private async makeRequest<T>(endpoint: string): Promise<T | null> {
    const authHeader = await this.getAuthHeader();
    if (!authHeader) {
      console.log('Planning Center: No valid credentials configured');
      return null;
    }

    try {
      const response = await fetch(`${PC_BASE_URL}${endpoint}`, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`Planning Center API error: ${response.status} ${response.statusText}`);
        return null;
      }

      return await response.json() as T;
    } catch (error) {
      console.error('Planning Center API request failed:', error);
      return null;
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    const authHeader = await this.getAuthHeader();
    if (!authHeader) {
      return { success: false, message: 'No credentials configured' };
    }

    try {
      const response = await fetch(`${PC_BASE_URL}/services/v2/me`, {
        headers: {
          'Authorization': authHeader,
        },
      });

      if (response.ok) {
        return { success: true, message: 'Connection successful' };
      } else if (response.status === 401) {
        return { success: false, message: 'Invalid credentials' };
      } else {
        return { success: false, message: `API error: ${response.status}` };
      }
    } catch (error) {
      return { success: false, message: `Connection failed: ${error}` };
    }
  }

  async getServiceTypes(): Promise<PCServiceType[]> {
    const response = await this.makeRequest<PCApiResponse<PCServiceType>>('/services/v2/service_types');
    if (!response || !Array.isArray(response.data)) {
      return [];
    }
    return response.data;
  }

  async getUpcomingPlans(serviceTypeId: string): Promise<PCPlan[]> {
    const today = new Date().toISOString().split('T')[0];
    const response = await this.makeRequest<PCApiResponse<PCPlan>>(
      `/services/v2/service_types/${serviceTypeId}/plans?filter=after&after=${today}&per_page=10`
    );
    if (!response || !Array.isArray(response.data)) {
      return [];
    }
    return response.data;
  }

  async getPersonSchedules(personId: string): Promise<PCSchedule[]> {
    const today = new Date().toISOString().split('T')[0];
    const response = await this.makeRequest<PCApiResponse<PCSchedule>>(
      `/services/v2/people/${personId}/schedules?filter=after&after=${today}&order=sort_date`
    );
    if (!response || !Array.isArray(response.data)) {
      return [];
    }
    return response.data;
  }

  async findPersonByEmail(email: string): Promise<{ id: string; name: string } | null> {
    const response = await this.makeRequest<PCApiResponse<{ id: string; attributes: { first_name: string; last_name: string } }>>(
      `/services/v2/people?where[search_name_or_email]=${encodeURIComponent(email)}`
    );
    
    if (!response || !Array.isArray(response.data) || response.data.length === 0) {
      return null;
    }
    
    const person = response.data[0];
    return {
      id: person.id,
      name: `${person.attributes.first_name} ${person.attributes.last_name}`,
    };
  }

  async syncUserAssignments(userId: string, userEmail: string): Promise<number> {
    // First, validate that we have valid credentials and can connect
    const connectionTest = await this.testConnection();
    if (!connectionTest.success) {
      console.log(`Planning Center: Connection failed - ${connectionTest.message}`);
      throw new Error(`Planning Center connection failed: ${connectionTest.message}`);
    }

    const person = await this.findPersonByEmail(userEmail);
    if (!person) {
      console.log(`Planning Center: No person found for email ${userEmail}`);
      return 0;
    }
    
    const schedules = await this.getPersonSchedules(person.id);
    
    // Only delete existing assignments after we've successfully fetched new data
    // This prevents data loss if the API call fails
    if (schedules.length > 0) {
      await storage.deleteServiceAssignmentsByUser(userId);
    }

    let syncCount = 0;
    for (const schedule of schedules) {
      const needsResponse = schedule.attributes.status === 'U' || 
                          schedule.attributes.status === 'unconfirmed';
      
      await storage.upsertServiceAssignment({
        userId,
        planningCenterScheduleId: schedule.id,
        planningCenterServiceId: schedule.relationships?.plan?.data?.id,
        serviceTypeName: schedule.attributes.team_name || 'Unknown Service',
        serviceName: schedule.attributes.short_dates || 'Service',
        teamName: schedule.attributes.team_name,
        positionName: schedule.attributes.team_position_name,
        scheduledDate: schedule.attributes.sort_date ? new Date(schedule.attributes.sort_date) : undefined,
        status: schedule.attributes.status === 'C' ? 'confirmed' : 
                schedule.attributes.status === 'D' ? 'declined' : 'pending',
        needsResponse,
        notes: schedule.attributes.notes,
      });
      syncCount++;
    }

    const settings = await storage.getIntegrationSettings('planning-center');
    if (settings) {
      await storage.upsertIntegrationSettings({
        integrationName: settings.integrationName,
        isEnabled: settings.isEnabled,
        credentials: settings.credentials as Record<string, unknown> | undefined,
        lastSyncAt: new Date(),
        syncStatus: 'success',
        syncError: null,
      });
    }

    return syncCount;
  }
}

export const planningCenterService = new PlanningCenterService();
