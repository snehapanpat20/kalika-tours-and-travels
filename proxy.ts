import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { isLocale } from "@/lib/i18n/locales"
import { negotiateLocale } from "@/lib/i18n/negotiate-locale"

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const segment = pathname.split("/").filter(Boolean)[0]

  if (segment && isLocale(segment)) {
    return NextResponse.next()
  }

  const locale = negotiateLocale(request.headers.get("accept-language"))
  const url = request.nextUrl.clone()
  url.pathname = pathname === "/" ? `/${locale}` : `/${locale}${pathname}`
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ["/((?!api|admin|_next/static|_next/image|.*\\..*).*)"],
}
