import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  FileText,
  Book,
  GraduationCap,
  Folder,
  Download,
  ExternalLink,
  Search,
  Filter,
  ChevronRight,
  Users,
  Lock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useRole } from "@/hooks/useRole";
import type { Manual } from "@shared/schema";

const categoryInfo = {
  ministry_manual: {
    label: 'Ministry Manuals',
    description: 'Specific guides for each ministry team',
    icon: Book,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  leadership_training: {
    label: 'Leadership Training',
    description: 'Resources for growing as a leader',
    icon: GraduationCap,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  resource: {
    label: 'Resources',
    description: 'General documents and reference materials',
    icon: Folder,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
  },
};

export default function ResourcesLibrary() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const { canAccessLeadershipPortal, user } = useRole();

  const { data: manuals, isLoading } = useQuery<Manual[]>({
    queryKey: ["/api/manuals"],
  });

  const { data: userMinistries } = useQuery<any[]>({
    queryKey: ["/api/role-assignments/me"],
  });

  const userMinistryIds = userMinistries?.map(m => m.ministryId) || [];

  const filteredManuals = manuals?.filter(manual => {
    const matchesSearch = !searchQuery || 
      manual.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (manual.description && manual.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = activeTab === "all" || manual.category === activeTab;

    const hasAccess = canAccessLeadershipPortal || 
      manual.category !== 'ministry_manual' ||
      !manual.ministryId ||
      userMinistryIds.includes(manual.ministryId);

    return matchesSearch && matchesCategory && hasAccess;
  }) || [];

  const groupedManuals = {
    ministry_manual: filteredManuals.filter(m => m.category === 'ministry_manual'),
    leadership_training: filteredManuals.filter(m => m.category === 'leadership_training'),
    resource: filteredManuals.filter(m => m.category === 'resource'),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Resources Library</h1>
          <p className="text-muted-foreground">
            Access ministry manuals, training materials, and reference documents
          </p>
        </div>
        <Link href="/help">
          <Button variant="outline" size="sm" data-testid="button-help">
            <FileText className="h-4 w-4 mr-2" />
            Help Center
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-resources-search"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
          <TabsTrigger value="ministry_manual" data-testid="tab-ministry">Ministry</TabsTrigger>
          <TabsTrigger value="leadership_training" data-testid="tab-leadership">Leadership</TabsTrigger>
          <TabsTrigger value="resource" data-testid="tab-resources">Resources</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : activeTab === "all" ? (
            <div className="space-y-8">
              {Object.entries(groupedManuals).map(([category, items]) => {
                if (items.length === 0) return null;
                const info = categoryInfo[category as keyof typeof categoryInfo];
                const Icon = info.icon;
                
                return (
                  <div key={category} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${info.bgColor}`}>
                        <Icon className={`h-5 w-5 ${info.color}`} />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold">{info.label}</h2>
                        <p className="text-sm text-muted-foreground">{info.description}</p>
                      </div>
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {items.map(manual => (
                        <ManualCard key={manual.id} manual={manual} />
                      ))}
                    </div>
                  </div>
                );
              })}
              
              {filteredManuals.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No resources found.</p>
                    {searchQuery && (
                      <p className="text-sm mt-1">Try different search terms.</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredManuals.length > 0 ? (
                filteredManuals.map(manual => (
                  <ManualCard key={manual.id} manual={manual} />
                ))
              ) : (
                <Card className="col-span-full">
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No resources in this category.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ManualCard({ manual }: { manual: Manual }) {
  const categoryData = categoryInfo[manual.category as keyof typeof categoryInfo] || categoryInfo.resource;
  const Icon = categoryData.icon;

  const handleOpenPdf = () => {
    if (manual.fileUrl) {
      window.open(manual.fileUrl, '_blank');
    }
  };

  return (
    <Card className="hover-elevate cursor-pointer" onClick={handleOpenPdf} data-testid={`card-manual-${manual.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${categoryData.bgColor} flex-shrink-0`}>
            <Icon className={`h-4 w-4 ${categoryData.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium line-clamp-2">{manual.title}</h3>
            {manual.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {manual.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-3">
              {manual.isRequired && (
                <Badge variant="secondary" className="text-xs">
                  Required
                </Badge>
              )}
              {manual.fileUrl && (
                <Badge variant="outline" className="text-xs gap-1">
                  <FileText className="h-3 w-3" />
                  PDF
                </Badge>
              )}
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}
