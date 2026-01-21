import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { RoleAssignment, Ministry } from "@shared/schema";

interface MinistryContextValue {
  selectedMinistryId: string | null;
  setSelectedMinistryId: (id: string | null) => void;
  selectedMinistry: Ministry | undefined;
  activeAssignments: RoleAssignment[];
  ministries: Ministry[];
  hasMultipleMinistries: boolean;
  isLoading: boolean;
}

const MinistryContext = createContext<MinistryContextValue | undefined>(undefined);

export function MinistryProvider({ children }: { children: ReactNode }) {
  const [selectedMinistryId, setSelectedMinistryId] = useState<string | null>(null);

  const { data: myAssignments = [], isLoading: loadingAssignments } = useQuery<RoleAssignment[]>({
    queryKey: ["/api/role-assignments/my"],
  });

  const { data: ministries = [], isLoading: loadingMinistries } = useQuery<Ministry[]>({
    queryKey: ["/api/ministries"],
  });

  const activeAssignments = myAssignments.filter(a => a.isActive && a.ministryId);
  const hasMultipleMinistries = activeAssignments.length > 1;

  useEffect(() => {
    const saved = localStorage.getItem("selectedMinistryId");
    if (saved && activeAssignments.find(a => a.ministryId === saved)) {
      setSelectedMinistryId(saved);
    } else if (activeAssignments.length > 0 && activeAssignments[0].ministryId) {
      setSelectedMinistryId(activeAssignments[0].ministryId);
    }
  }, [activeAssignments]);

  const handleSetSelectedMinistryId = (id: string | null) => {
    setSelectedMinistryId(id);
    if (id) {
      localStorage.setItem("selectedMinistryId", id);
    } else {
      localStorage.removeItem("selectedMinistryId");
    }
  };

  const selectedMinistry = selectedMinistryId 
    ? ministries.find(m => m.id === selectedMinistryId) 
    : undefined;

  return (
    <MinistryContext.Provider
      value={{
        selectedMinistryId,
        setSelectedMinistryId: handleSetSelectedMinistryId,
        selectedMinistry,
        activeAssignments,
        ministries,
        hasMultipleMinistries,
        isLoading: loadingAssignments || loadingMinistries,
      }}
    >
      {children}
    </MinistryContext.Provider>
  );
}

export function useMinistryContext() {
  const context = useContext(MinistryContext);
  if (context === undefined) {
    throw new Error("useMinistryContext must be used within a MinistryProvider");
  }
  return context;
}
