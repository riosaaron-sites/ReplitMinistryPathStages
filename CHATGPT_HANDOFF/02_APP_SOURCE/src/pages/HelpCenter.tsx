import { useState, useMemo } from "react";
import { Link } from "wouter";
import { 
  Search, 
  Rocket, 
  GraduationCap, 
  Heart, 
  ClipboardList, 
  BarChart, 
  BookOpen, 
  Settings,
  ArrowLeft,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Church
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { helpCategories, helpArticles, HelpArticle, HelpCategory } from "@/lib/helpCenterData";
import { ThemeToggle } from "@/components/ThemeToggle";

const categoryIcons: Record<string, typeof Rocket> = {
  'rocket': Rocket,
  'graduation-cap': GraduationCap,
  'heart': Heart,
  'clipboard-list': ClipboardList,
  'bar-chart': BarChart,
  'book-open': BookOpen,
  'settings': Settings,
};

function CategoryIcon({ iconName, className }: { iconName: string; className?: string }) {
  const IconComponent = categoryIcons[iconName] || HelpCircle;
  return <IconComponent className={className} />;
}

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);

  const filteredArticles = useMemo(() => {
    let articles = helpArticles;
    
    if (selectedCategory) {
      articles = articles.filter(a => a.category === selectedCategory);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      articles = articles.filter(
        a => 
          a.title.toLowerCase().includes(query) ||
          a.summary.toLowerCase().includes(query) ||
          a.body.toLowerCase().includes(query)
      );
    }
    
    return articles;
  }, [searchQuery, selectedCategory]);

  const selectedCategoryData = selectedCategory 
    ? helpCategories.find(c => c.id === selectedCategory)
    : null;

  const handleBack = () => {
    if (selectedArticle) {
      setSelectedArticle(null);
    } else if (selectedCategory) {
      setSelectedCategory(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <div className="flex items-center gap-2 hover-elevate rounded-md px-2 py-1 cursor-pointer">
                <Church className="h-6 w-6 text-primary" />
                <span className="font-serif text-lg font-semibold hidden sm:inline">Garden City Church</span>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/dashboard">
              <Button variant="outline" size="sm" data-testid="button-back-to-app">
                Back to App
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {selectedArticle ? (
          <ArticleView 
            article={selectedArticle} 
            onBack={handleBack}
            category={helpCategories.find(c => c.id === selectedArticle.category)}
          />
        ) : selectedCategory ? (
          <CategoryView
            category={selectedCategoryData!}
            articles={filteredArticles}
            onBack={handleBack}
            onSelectArticle={setSelectedArticle}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        ) : (
          <HomeView
            categories={helpCategories}
            articles={helpArticles}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectCategory={setSelectedCategory}
            onSelectArticle={setSelectedArticle}
            filteredArticles={filteredArticles}
          />
        )}
      </main>

      <footer className="border-t py-6 px-4 text-center text-sm text-muted-foreground">
        <p>&copy; Aaron Rios — Garden City Church</p>
        <p className="mt-1">Live the life. Tell the Story.</p>
      </footer>
    </div>
  );
}

interface HomeViewProps {
  categories: HelpCategory[];
  articles: HelpArticle[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectCategory: (categoryId: string) => void;
  onSelectArticle: (article: HelpArticle) => void;
  filteredArticles: HelpArticle[];
}

function HomeView({ 
  categories, 
  searchQuery, 
  onSearchChange, 
  onSelectCategory,
  onSelectArticle,
  filteredArticles 
}: HomeViewProps) {
  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Help Center</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Find answers to common questions about MinistryPath
        </p>
      </div>

      <div className="max-w-xl mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for help..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
            data-testid="input-help-search"
          />
        </div>
      </div>

      {isSearching ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            {filteredArticles.length} result{filteredArticles.length !== 1 ? 's' : ''} for "{searchQuery}"
          </h2>
          <div className="grid gap-3">
            {filteredArticles.map(article => (
              <Card 
                key={article.id} 
                className="cursor-pointer hover-elevate"
                onClick={() => onSelectArticle(article)}
                data-testid={`card-article-${article.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium">{article.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {article.summary}
                      </p>
                      <Badge variant="secondary" className="mt-2">
                        {categories.find(c => c.id === article.category)?.title || article.category}
                      </Badge>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredArticles.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No articles found matching your search.</p>
                  <p className="text-sm mt-1">Try different keywords or browse categories below.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(category => (
            <Card 
              key={category.id}
              className="cursor-pointer hover-elevate"
              onClick={() => onSelectCategory(category.id)}
              data-testid={`card-category-${category.id}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <CategoryIcon iconName={category.icon} className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold">{category.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {category.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="text-center pt-4">
        <p className="text-sm text-muted-foreground mb-2">
          Can't find what you're looking for?
        </p>
        <Link href="/requests">
          <Button variant="outline" data-testid="button-contact-support">
            <HelpCircle className="h-4 w-4 mr-2" />
            Contact Support
          </Button>
        </Link>
      </div>
    </div>
  );
}

interface CategoryViewProps {
  category: HelpCategory;
  articles: HelpArticle[];
  onBack: () => void;
  onSelectArticle: (article: HelpArticle) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

function CategoryView({ 
  category, 
  articles, 
  onBack, 
  onSelectArticle,
  searchQuery,
  onSearchChange 
}: CategoryViewProps) {
  return (
    <div className="space-y-6">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onBack}
        className="gap-2"
        data-testid="button-back"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Help Center
      </Button>

      <div className="flex items-center gap-4">
        <div className="p-3 rounded-lg bg-primary/10 text-primary">
          <CategoryIcon iconName={category.icon} className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{category.title}</h1>
          <p className="text-muted-foreground">{category.description}</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={`Search in ${category.title}...`}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
          data-testid="input-category-search"
        />
      </div>

      <div className="grid gap-3">
        {articles.map(article => (
          <Card 
            key={article.id} 
            className="cursor-pointer hover-elevate"
            onClick={() => onSelectArticle(article)}
            data-testid={`card-article-${article.id}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium">{article.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {article.summary}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        ))}
        {articles.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <p>No articles found.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

interface ArticleViewProps {
  article: HelpArticle;
  onBack: () => void;
  category?: HelpCategory;
}

function ArticleView({ article, onBack, category }: ArticleViewProps) {
  const bodyParagraphs = article.body.split('\n\n');

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onBack}
        className="gap-2"
        data-testid="button-back"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {category?.title || 'Category'}
      </Button>

      <div>
        {category && (
          <Badge variant="secondary" className="mb-3">
            {category.title}
          </Badge>
        )}
        <h1 className="text-2xl font-bold">{article.title}</h1>
        <p className="text-muted-foreground mt-2">{article.summary}</p>
      </div>

      <Separator />

      <ScrollArea className="pr-4">
        <div className="prose prose-sm dark:prose-invert max-w-none space-y-4">
          {bodyParagraphs.map((paragraph, index) => {
            if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
              return (
                <h3 key={index} className="font-semibold text-base mt-6 mb-2">
                  {paragraph.replace(/\*\*/g, '')}
                </h3>
              );
            }
            
            if (paragraph.includes('\n-')) {
              const lines = paragraph.split('\n');
              const title = lines[0];
              const items = lines.slice(1).filter(l => l.startsWith('-'));
              return (
                <div key={index}>
                  {title && (
                    <h4 className="font-semibold text-sm mb-2">
                      {title.replace(/\*\*/g, '')}
                    </h4>
                  )}
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {items.map((item, i) => (
                      <li key={i}>{item.replace(/^-\s*/, '').replace(/\*\*/g, '')}</li>
                    ))}
                  </ul>
                </div>
              );
            }

            if (paragraph.includes('\n1.')) {
              const lines = paragraph.split('\n');
              const title = lines[0];
              const items = lines.slice(1).filter(l => /^\d+\./.test(l));
              return (
                <div key={index}>
                  {title && (
                    <h4 className="font-semibold text-sm mb-2">
                      {title.replace(/\*\*/g, '')}
                    </h4>
                  )}
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    {items.map((item, i) => (
                      <li key={i}>{item.replace(/^\d+\.\s*/, '').replace(/\*\*/g, '')}</li>
                    ))}
                  </ol>
                </div>
              );
            }

            return (
              <p key={index} className="text-sm leading-relaxed">
                {paragraph.split('**').map((part, i) => 
                  i % 2 === 0 ? part : <strong key={i}>{part}</strong>
                )}
              </p>
            );
          })}
        </div>
      </ScrollArea>

      {article.relatedLinks.length > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="font-semibold mb-3">Related Links</h3>
            <div className="flex flex-wrap gap-2">
              {article.relatedLinks.map((link, index) => (
                <Link key={index} href={link.path}>
                  <Button variant="outline" size="sm" className="gap-2" data-testid={`link-related-${index}`}>
                    {link.label}
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
