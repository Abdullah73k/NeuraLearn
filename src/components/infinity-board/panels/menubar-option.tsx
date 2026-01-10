import { MenubarMenu, MenubarTrigger } from "@/components/ui/menubar";
import { ComponentProps } from "react";

type MenubarOptionProps = {
	option: string;
	onClick?: () => void;
} & ComponentProps<typeof MenubarMenu>;

export default function MenubarOption({
	option,
	onClick,
}: MenubarOptionProps) {
	return (
		<MenubarMenu>
			<MenubarTrigger className="cursor-pointer" onClick={onClick}>
				{option}
			</MenubarTrigger>
		</MenubarMenu>
	);
}
