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
        "peer relative flex size-4 shrink-0 items-center justify-center rounded-md border border-slate-800 bg-[#0c0c14] transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30 focus-visible:border-orange-500/50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
        // checked styles
        "data-checked:border-orange-500 data-checked:bg-orange-500 data-checked:text-slate-950 data-checked:shadow-[0_0_8px_rgba(249,115,22,0.4)]",
        // indeterminate styles
        "data-indeterminate:border-orange-500 data-indeterminate:bg-orange-500/10 data-indeterminate:text-orange-500 data-indeterminate:shadow-[0_0_8px_rgba(249,115,22,0.2)]",
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
