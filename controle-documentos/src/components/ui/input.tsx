import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> { }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    "flex w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-lg shadow-sm placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 focus-visible:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors dark:bg-gray-950 dark:border-gray-700 dark:text-white dark:placeholder:text-gray-400 dark:focus-visible:ring-blue-900 dark:focus-visible:border-blue-500 dark:[color-scheme:dark]",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Input.displayName = "Input"

export { Input }
