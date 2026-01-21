import { useState, type MouseEvent } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";

interface ConfirmDialogProps {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  confirmPhrase?: string;
  testId?: string;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  confirmPhrase,
  testId = "confirm-dialog",
  onConfirm,
}: ConfirmDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [phraseInput, setPhraseInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requiresPhrase = !!confirmPhrase;
  const phraseMatches = !requiresPhrase || phraseInput === confirmPhrase;

  const handleConfirm = async (e: MouseEvent) => {
    e.preventDefault();
    if (!phraseMatches) return;
    
    setIsLoading(true);
    setError(null);
    try {
      await onConfirm();
      setIsOpen(false);
      setPhraseInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setPhraseInput("");
      setError(null);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild data-testid={`${testId}-trigger`}>
        {trigger}
      </AlertDialogTrigger>
      <AlertDialogContent data-testid={`${testId}-content`}>
        <AlertDialogHeader>
          <AlertDialogTitle data-testid={`${testId}-title`}>{title}</AlertDialogTitle>
          <AlertDialogDescription data-testid={`${testId}-description`}>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm" data-testid={`${testId}-error`}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        {requiresPhrase && (
          <div className="space-y-2 py-4">
            <Label htmlFor="confirm-phrase">
              Type <span className="font-mono font-bold text-destructive">{confirmPhrase}</span> to confirm:
            </Label>
            <Input
              id="confirm-phrase"
              value={phraseInput}
              onChange={(e) => setPhraseInput(e.target.value)}
              placeholder={confirmPhrase}
              data-testid={`${testId}-phrase-input`}
            />
          </div>
        )}
        
        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={() => { setPhraseInput(""); setError(null); }}
            data-testid={`${testId}-cancel`}
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!phraseMatches || isLoading}
            className={variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            data-testid={`${testId}-confirm`}
          >
            {isLoading ? "Processing..." : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
