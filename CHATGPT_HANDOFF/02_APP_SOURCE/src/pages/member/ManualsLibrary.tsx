import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BookOpen, 
  FileText, 
  Download, 
  Eye,
  Search,
  Filter,
  Loader2,
  FolderOpen,
  Star,
  ExternalLink
} from "lucide-react";
import type { Manual, Ministry, RoleAssignment } from "@shared/schema";

interface ManualWithMinistry extends Manual {
  ministry?: Ministry;
}

const MANUAL_CATEGORIES = [
  { id: 'all', label: 'All Manuals' },
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'policies', label: 'Policies & Procedures' },
  { id: 'training', label: 'Training Materials' },
  { id: 'safety', label: 'Safety & Security' },
  { id: 'ministry-specific', label: 'Ministry Specific' },
];

function ManualCard({ manual }: { manual: ManualWithMinistry }) {
  const getFileIcon = () => {
    switch (manual.fileType) {
      case 'pdf':
        return <FileText className="h-8 w-8 text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="h-8 w-8 text-blue-500" />;
      default:
        return <FileText className="h-8 w-8 text-muted-foreground" />;
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card className="hover-elevate transition-all" data-testid={`card-manual-${manual.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-muted/50">
            {getFileIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">{manual.title}</h3>
              {manual.isRequired && (
                <Badge variant="default" className="text-xs">
                  <Star className="h-3 w-3 mr-1" />
                  Required
                </Badge>
              )}
            </div>
            {manual.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {manual.description}
              </p>
            )}
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              {manual.ministry && (
                <Badge variant="outline" className="text-xs">
                  {manual.ministry.name}
                </Badge>
              )}
              {manual.category && (
                <Badge variant="secondary" className="text-xs">
                  {manual.category}
                </Badge>
              )}
              {manual.fileSize && (
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(manual.fileSize)}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {manual.fileUrl && (
              <>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => window.open(manual.fileUrl!, '_blank')}
                  data-testid={`button-view-${manual.id}`}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = manual.fileUrl!;
                    link.download = manual.title;
                    link.click();
                  }}
                  data-testid={`button-download-${manual.id}`}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ManualsLibrary() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [ministryFilter, setMinistryFilter] = useState<string>("all");

  const { data: manuals = [], isLoading } = useQuery<ManualWithMinistry[]>({
    queryKey: ["/api/manuals"],
  });

  const { data: myAssignments = [] } = useQuery<RoleAssignment[]>({
    queryKey: ["/api/role-assignments/my"],
  });

  const { data: ministries = [] } = useQuery<Ministry[]>({
    queryKey: ["/api/ministries"],
  });

  const myMinistryIds = myAssignments.filter(a => a.isActive).map(a => a.ministryId);

  const filteredManuals = manuals.filter(manual => {
    const matchesSearch = searchQuery === '' || 
      manual.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      manual.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || manual.category === categoryFilter;
    
    const matchesMinistry = ministryFilter === 'all' || 
      manual.ministryId === ministryFilter ||
      (!manual.ministryId && ministryFilter === 'general');
    
    return matchesSearch && matchesCategory && matchesMinistry;
  });

  const requiredManuals = filteredManuals.filter(m => m.isRequired);
  const generalManuals = filteredManuals.filter(m => !m.ministryId);
  const myMinistryManuals = filteredManuals.filter(m => 
    m.ministryId && myMinistryIds.includes(m.ministryId)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <BookOpen className="w-6 h-6" />
            Manuals Library
          </h1>
          <p className="text-muted-foreground">
            Access training materials, policies, and ministry guides
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search manuals..." 
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-category">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {MANUAL_CATEGORIES.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={ministryFilter} onValueChange={setMinistryFilter}>
          <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-ministry">
            <SelectValue placeholder="Ministry" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ministries</SelectItem>
            <SelectItem value="general">General</SelectItem>
            {ministries.map(m => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList data-testid="tabs-manuals">
          <TabsTrigger value="all" data-testid="tab-all">
            All ({filteredManuals.length})
          </TabsTrigger>
          <TabsTrigger value="required" data-testid="tab-required">
            <Star className="h-4 w-4 mr-1" />
            Required ({requiredManuals.length})
          </TabsTrigger>
          <TabsTrigger value="my-ministries" data-testid="tab-my-ministries">
            My Ministries ({myMinistryManuals.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {filteredManuals.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FolderOpen className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">No manuals found</p>
                <p className="text-sm">Try adjusting your search or filters</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredManuals.map(manual => (
                <ManualCard key={manual.id} manual={manual} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="required" className="space-y-4">
          {requiredManuals.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Star className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">No required manuals</p>
                <p className="text-sm">You're all caught up!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {requiredManuals.map(manual => (
                <ManualCard key={manual.id} manual={manual} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-ministries" className="space-y-4">
          {myMinistryManuals.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <BookOpen className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">No ministry-specific manuals</p>
                <p className="text-sm">
                  {myMinistryIds.length === 0 
                    ? "Join a ministry team to access their materials" 
                    : "Check back later for new materials"}
                </p>
                {myMinistryIds.length === 0 && (
                  <Button variant="outline" className="mt-4" asChild>
                    <a href="/teams">Browse Teams</a>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {myMinistryManuals.map(manual => (
                <ManualCard key={manual.id} manual={manual} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {generalManuals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              Church-Wide Resources
            </CardTitle>
            <CardDescription>
              General resources available to all members
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {generalManuals.slice(0, 5).map(manual => (
              <div 
                key={manual.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover-elevate"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{manual.title}</p>
                    {manual.category && (
                      <p className="text-xs text-muted-foreground">{manual.category}</p>
                    )}
                  </div>
                </div>
                {manual.fileUrl && (
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => window.open(manual.fileUrl!, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
