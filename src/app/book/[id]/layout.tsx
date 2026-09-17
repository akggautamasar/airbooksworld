"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

type Props = {
  children: React.ReactNode;
  params: { id: string };
};

export default function BookRouteLayout({ children, params }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname === `/book/${params.id}`) {
      router.replace(`/volume/${params.id}`);
    }
  }, [pathname, params.id, router]);

  if (pathname === `/book/${params.id}`) return null;
  return children;
}
