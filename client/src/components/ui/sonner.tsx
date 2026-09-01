import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "light" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster dj-toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "dj-toast",
          success: "dj-toast--success",
          error: "dj-toast--error",
          warning: "dj-toast--warning",
          info: "dj-toast--info",
          title: "dj-toast__title",
          description: "dj-toast__description",
          closeButton: "dj-toast__close",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
