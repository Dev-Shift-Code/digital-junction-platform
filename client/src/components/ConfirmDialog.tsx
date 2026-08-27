import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Continue",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onOpenChange,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="overflow-hidden rounded-[1.45rem] border border-[#1A312C]/12 bg-[#FFF4E1] p-0 text-[#1A312C] shadow-[0_24px_80px_rgba(26,49,44,.22)]">
        <div className="h-1.5 bg-gradient-to-r from-[#1A312C] via-[#428475] to-[#89D7B7]" />
        <AlertDialogHeader className="px-6 pt-6 text-left sm:px-7 sm:pt-7">
          <div className="flex items-start gap-3">
            <span className={`grid size-10 shrink-0 place-items-center rounded-full ${destructive ? "bg-[#F2D7C7] text-[#9E4D3D]" : "bg-[#CFEDE0] text-[#286C60]"}`}>
              <AlertTriangle className="size-5" aria-hidden="true" />
            </span>
            <div>
              <AlertDialogTitle className="font-display text-2xl font-medium tracking-tight text-[#1A312C]">{title}</AlertDialogTitle>
              <AlertDialogDescription className="mt-2 text-sm leading-6 text-[#1A312C]/65">{description}</AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="border-t border-[#1A312C]/10 bg-[#1A312C]/[.025] px-6 py-4 sm:px-7">
          <AlertDialogCancel className="button-quiet min-h-10 rounded-xl border-0 bg-transparent px-4 text-[#1A312C] hover:bg-[#1A312C]/[.06]">{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className={`min-h-10 rounded-xl px-4 text-white shadow-none ${destructive ? "bg-[#9E4D3D] hover:bg-[#853F32]" : "button-primary"}`}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export type { ConfirmDialogProps };

