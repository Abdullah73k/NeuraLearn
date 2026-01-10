import { MenubarMenu, MenubarTrigger } from "@/components/ui/menubar";

export default function PanelOption({ option }: { option: string }) {
	return (
		<MenubarMenu>
			<MenubarTrigger className="cursor-pointer">{option}</MenubarTrigger>
		</MenubarMenu>
	);
}
