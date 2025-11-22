import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";

const cn = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(' ');
};

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Root
      className={cn("grid gap-3", className)}
      {...props}
      ref={ref}
    />
  );
});
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, style, ...props }, ref) => {
  const [isChecked, setIsChecked] = React.useState(false);
  const internalRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    const element = internalRef.current;
    if (!element) return;

    const updateCheckedState = () => {
      setIsChecked(element.getAttribute('data-state') === 'checked');
    };

    updateCheckedState();

    const observer = new MutationObserver(updateCheckedState);
    observer.observe(element, { attributes: true, attributeFilter: ['data-state'] });

    return () => observer.disconnect();
  }, []);

  React.useImperativeHandle(ref, () => internalRef.current!);

  const checkedStyle = isChecked ? {
    borderColor: 'rgb(79, 70, 229)', // indigo-600
    backgroundColor: 'rgb(79, 70, 229)', // indigo-600
  } : {
    borderColor: 'rgb(156, 163, 175)', // gray-400
  };

  return (
    <RadioGroupPrimitive.Item
      ref={internalRef}
      className={cn(
        "aspect-square h-6 w-6 rounded-full border-2 transition-all",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      style={{ ...checkedStyle, ...style }}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <div style={{
          width: '12px',
          height: '12px',
          borderRadius: '9999px',
          backgroundColor: 'white'
        }} />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
});
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RadioGroup, RadioGroupItem };
