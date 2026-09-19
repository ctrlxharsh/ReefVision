import React from "react";
import * as Select from "@radix-ui/react-select";
import { ChevronDown, Check } from "lucide-react";

export interface UISelectOption {
  value: string;
  label: string;
}

interface UISelectProps {
  value: string;
  onChange: (value: string) => void;
  options: UISelectOption[];
  placeholder?: string;
  className?: string;
}

export const UISelect: React.FC<UISelectProps> = ({
  value,
  onChange,
  options,
  placeholder,
  className = "",
}) => {
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger className={`ui-select-trigger ${className}`} aria-label={placeholder}>
        <Select.Value placeholder={placeholder} />
        <Select.Icon className="ui-select-icon">
          <ChevronDown size={14} />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content className="ui-select-content" position="popper" sideOffset={4}>
          <Select.Viewport className="ui-select-viewport">
            {options.map((opt) => (
              <Select.Item key={opt.value} value={opt.value} className="ui-select-item">
                <Select.ItemText>{opt.label}</Select.ItemText>
                <Select.ItemIndicator className="ui-select-indicator">
                  <Check size={14} />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
};
