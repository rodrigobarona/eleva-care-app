interface StepListProps {
  title: string;
  steps: string[];
}

export function StepList({ title, steps }: StepListProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-foreground font-serif text-lg font-light">{title}</h3>
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className="bg-eleva-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white">
              {index + 1}
            </div>
            <p className="text-muted-foreground text-sm">{step}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
