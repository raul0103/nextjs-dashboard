import Pagination from "@/src/ui/invoices/pagination";
import Search from "@/src/ui/search";
import Table from "@/src/ui/invoices/table";
import { CreateInvoice } from "@/src/ui/invoices/buttons";
import { lusitana } from "@/src/ui/fonts";
import { InvoicesTableSkeleton } from "@/src/ui/skeletons";
import { Suspense } from "react";
import { fetchInvoicesPages } from "@/src/lib/data";

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{
    query?: string;
    page?: string;
  }>;
}) {
  const search_params = await searchParams;

  // const searchParams = props.searchParams;
  const query = search_params?.query || "";
  const currentPage = Number(search_params?.page) || 1;

  const totalPages = await fetchInvoicesPages(query);

  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-between">
        <h1 className={`${lusitana.className} text-2xl`}>Invoices</h1>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 md:mt-8">
        <Search placeholder="Search invoices..." />
        <CreateInvoice />
      </div>
      <Suspense key={query + currentPage} fallback={<InvoicesTableSkeleton />}>
        <Table query={query} currentPage={currentPage} />
      </Suspense>
      <div className="mt-5 flex w-full justify-center">
        <Pagination totalPages={totalPages} currentPage={currentPage} />
      </div>
    </div>
  );
}
