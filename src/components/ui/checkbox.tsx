"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { cn } from "@/lib/utils"
import { Check, Minus } from "lucide-react"

function Checkbox({ className, checked, indeterminate, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      checked={checked}
      indeterminate={indeterminate}
      className={cn(
        "peer relative flex size-4.5 shrink-0 items-center justify-center rounded-full border-2 border-slate-400 dark:border-slate-500 bg-background transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-red-600/30 focus-visible:border-red-600/50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer hover:border-red-600/80 hover:scale-105",
        // checked styles
        "data-checked:border-red-650 data-checked:bg-red-650 data-checked:text-white data-checked:shadow-[0_0_10px_rgba(229,9,20,0.5)]",
        // indeterminate styles
        "data-indeterminate:border-red-650 data-indeterminate:bg-red-650/10 data-indeterminate:text-red-650 data-indeterminate:shadow-[0_0_8px_rgba(229,9,20,0.2)]",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-3"
      >
        {indeterminate ? (
          <Minus className="stroke-[3]" />
        ) : (
          <Check className="stroke-[3]" />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
