import { redirect } from "next/navigation";

type Props = {
  children: React.ReactNode;
  params: { id: string };
};

export default function BookRouteLayout({ children, params }: Props) {
  redirect(`/volume/${params.id}`);
  return children;
}
