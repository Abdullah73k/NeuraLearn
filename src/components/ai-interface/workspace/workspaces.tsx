import { MindMapWorkspace } from "@/types/store.types";
import Workspace from "./workspace";

export default function Workspaces({
	workspaces,
	isMobile,
}: {
	workspaces: MindMapWorkspace[];
	isMobile: boolean;
}) {
	return (
		<>
			{workspaces.map(({ id, title }) => (
				<Workspace key={id} id={id} title={title} isMobile={isMobile} />
			))}
		</>
	);
}
