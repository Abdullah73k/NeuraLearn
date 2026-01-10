import { MenubarMenu, MenubarTrigger } from "@/components/ui/menubar";

export default function MenuBarOption({ option }: { option: string }) {
	return (
		<MenubarMenu>
			<MenubarTrigger className="cursor-pointer">{option}</MenubarTrigger>
		</MenubarMenu>
	);
}
