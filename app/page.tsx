import MembersViews from "@/components/MembersViews";
import MemberDetailModal from "@/components/modal/MemberDetailModal";
import ViewToggle from "@/components/ViewToggle";
import { UserProvider } from "@/components/UserProvider";
import { MemberListProvider } from "@/context/MemberListContext";
import { getSupabase } from "@/utils/supabase/queries";
import { LogIn } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import config from "./config";

// Trang chủ đọc dữ liệu theo request (cookie/anon) nên phải render động.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await getSupabase();

  const [personsRes, relsRes] = await Promise.all([
    supabase
      .from("persons")
      .select("*")
      .order("birth_year", { ascending: true, nullsFirst: false }),
    supabase.from("relationships").select("*"),
  ]);

  const persons = personsRes.data || [];
  const relationships = relsRes.data || [];

  return (
    // Xem công khai: không có người dùng đăng nhập -> read-only, ẩn thông tin riêng tư.
    <UserProvider user={null} profile={null}>
      <Suspense fallback={null}>
        <MemberListProvider initialView="tree" initialShowAvatar={true}>
          <div className="min-h-screen bg-background text-foreground flex flex-col">
            {/* Header glass mảnh, wordmark + nhãn mono */}
            <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
                <Link href="/" className="flex items-baseline gap-2.5">
                  <span className="text-lg font-display font-bold tracking-tight text-foreground">
                    {config.siteName}
                  </span>
                  <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-widest text-muted-foreground border border-border px-1.5 py-0.5">
                    Gia phả
                  </span>
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md font-mono text-[11px] uppercase tracking-widest text-muted-foreground border border-border hover:bg-muted hover:text-foreground transition-colors"
                >
                  <LogIn className="size-3.5" />
                  <span className="hidden sm:inline">Đăng nhập</span>
                </Link>
              </div>
            </header>

            {persons.length > 0 ? (
              <>
                <ViewToggle tabs={["tree", "mindmap", "bubble"]} />
                <MembersViews
                  persons={persons}
                  relationships={relationships}
                  canEdit={false}
                />
                <MemberDetailModal />
              </>
            ) : (
              <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <p className="mono-label mb-3">Trống</p>
                <h2 className="text-2xl font-display font-bold text-foreground tracking-tight mb-2">
                  Chưa có dữ liệu gia phả
                </h2>
                <p className="text-muted-foreground max-w-md">
                  Vui lòng đăng nhập với quyền quản trị để nhập dữ liệu thành
                  viên, hoặc kiểm tra lại quyền đọc công khai (RLS) trên
                  Supabase.
                </p>
              </main>
            )}
          </div>
        </MemberListProvider>
      </Suspense>
    </UserProvider>
  );
}
