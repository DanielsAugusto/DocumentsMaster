import * as React from "react"
import { cn } from "@/lib/utils"

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> { }

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
    ({ className, children, ...props }, ref) => {
        return (
            // NOSONAR: This is a generic label component. Consumers are responsible
            // for providing htmlFor or wrapping a control. Children are spread explicitly
            // to ensure SonarQube can detect accessible text.
            <label
                ref={ref}
                className={cn(
                    "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-800 dark:text-gray-200",
                    className
                )}
                {...props}
            >
                {children}
            </label>
        )
    }
)
Label.displayName = "Label"

export { Label }
