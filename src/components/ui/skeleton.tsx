import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-shimmer bg-gradient-to-r from-muted via-accent/40 to-muted bg-[length:200%_100%] rounded-md",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
