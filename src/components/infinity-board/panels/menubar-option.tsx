import { MenubarMenu, MenubarTrigger } from "@/components/ui/menubar";
import { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type MenubarOptionProps = {
	option: string;
	onClick?: () => void;
	disabled?: boolean;
} & ComponentProps<typeof MenubarMenu>;

export default function MenubarOption({
	option,
	onClick,
	disabled = false,
}: MenubarOptionProps) {
	return (
		<MenubarMenu>
			<MenubarTrigger 
				className={cn(
					"cursor-pointer",
					disabled && "cursor-not-allowed opacity-50 pointer-events-none"
				)}
				onClick={disabled ? undefined : onClick}
				disabled={disabled}
			>
				{option}
			</MenubarTrigger>
		</MenubarMenu>
	);
}
