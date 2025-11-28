import { Card, CardContent } from "@/components/ui/card";

interface FormSectionProps {
    title?: string;
    description?: string;
    children: React.ReactNode;
    className?: string;
}

export function FormSection({ title, description, children, className }: FormSectionProps) {
    return (
        <Card className={className}>
            <CardContent>
                {(title || description) && (
                    <div className="space-y-1 mb-6">
                        {title && <h2 className="font-semibold">{title}</h2>}
                        {description && <p className="text-sm text-muted-foreground">{description}</p>}
                    </div>
                )}
                <div className="space-y-6">{children}</div>
            </CardContent>
        </Card>
    );
}
