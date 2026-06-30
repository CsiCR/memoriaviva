import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 4.5rem - 18rem)' }}>
        {children}
      </main>
      <Footer />
    </>
  );
}
