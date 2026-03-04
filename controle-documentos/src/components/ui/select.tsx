import * as React from "react"
import { cn } from "@/lib/utils"

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { }

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, ...props }, ref) => {
        return (
            <select
                className={cn(
                    "flex w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-lg shadow-sm placeholder:text-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors dark:bg-gray-950 dark:border-gray-700 dark:text-white dark:placeholder:text-gray-400 dark:focus:ring-blue-900 dark:focus:border-blue-500",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Select.displayName = "Select"

export { Select }
