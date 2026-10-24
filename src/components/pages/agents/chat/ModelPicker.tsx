import { ChevronDownIcon, CpuIcon } from 'lucide-react';
import {
  agent_model_id_schema,
  AGENT_MODEL_IDS,
  AGENT_MODELS,
  type AgentModelId
} from '~/agents/models';
import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu';

export function ModelPicker({
  value,
  onChange,
  disabled
}: {
  value: AgentModelId;
  onChange: (model: AgentModelId) => void;
  disabled?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="sm" disabled={disabled} className="text-muted-foreground" />
        }
      >
        <CpuIcon />
        {AGENT_MODELS[value].label}
        <ChevronDownIcon className="opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Model</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={value}
            onValueChange={(next) => {
              const parsed = agent_model_id_schema.safeParse(next);
              if (parsed.success) onChange(parsed.data);
            }}
          >
            {AGENT_MODEL_IDS.map((id) => (
              <DropdownMenuRadioItem key={id} value={id} className="flex-col items-start gap-0">
                <span className="font-medium">{AGENT_MODELS[id].label}</span>
                <span className="text-xs text-muted-foreground">{AGENT_MODELS[id].hint}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
