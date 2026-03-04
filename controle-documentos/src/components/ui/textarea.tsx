import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
    extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { }

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, ...props }, ref) => {
        return (
            <textarea
                className={cn(
                    "flex min-h-[100px] w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-lg shadow-sm placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 focus-visible:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 resize-y transition-colors dark:bg-gray-950 dark:border-gray-700 dark:text-white dark:placeholder:text-gray-400 dark:focus-visible:ring-blue-900 dark:focus-visible:border-blue-500",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Textarea.displayName = "Textarea"

export { Textarea }
