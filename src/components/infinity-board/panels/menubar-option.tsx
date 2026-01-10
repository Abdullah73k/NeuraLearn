import { MenubarMenu, MenubarTrigger } from "@/components/ui/menubar";

export default function MenubarOption({ option }: { option: string }) {
	return (
		<MenubarMenu>
			<MenubarTrigger className="cursor-pointer">{option}</MenubarTrigger>
		</MenubarMenu>
	);
}
