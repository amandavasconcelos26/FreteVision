import * as React from "react"
import { cn } from "@/src/lib/utils"

function Badge({ className, variant = "default", ...props }: React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "success" | "warning" | "destructive" }) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2",
        {
          "border-transparent bg-slate-900 text-slate-50 shadow hover:bg-slate-900/80": variant === "default",
          "border-transparent bg-green-500 text-white shadow": variant === "success",
          "border-transparent bg-yellow-500 text-white shadow": variant === "warning",
          "border-transparent bg-red-500 text-white shadow": variant === "destructive",
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
