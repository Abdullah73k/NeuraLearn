import { MenubarMenu, MenubarTrigger } from "@radix-ui/react-menubar";

export default function MenuBarOption({ option }: { option: string }) {
	return (
		<MenubarMenu>
			<MenubarTrigger className="cursor-pointer">{option}</MenubarTrigger>
		</MenubarMenu>
	);
}
