import mysql from "mysql2/promise";
import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  Revenue,
} from "./definitions";
import { formatCurrency } from "./utils";

let connection: mysql.Connection;

async function getConnection() {
  if (connection) return connection;

  connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST!,
    user: process.env.MYSQL_USER!,
    password: process.env.MYSQL_PASSWORD!,
    database: process.env.MYSQL_DATABASE!,
  });

  return connection;
}

export async function query<T>(sql: string, params: any[] = []): Promise<T> {
  const conn = await getConnection();
  const [rows] = await conn.execute(sql, params);
  return rows as T;
}

export async function fetchRevenue() {
  try {
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const data = await query<Revenue[]>(`SELECT * FROM revenue`);

    return data;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch revenue data.");
  }
}

export async function fetchLatestInvoices() {
  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const data = await query<LatestInvoiceRaw[]>(`
      SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      ORDER BY invoices.date DESC
      LIMIT 5
    `);

    return data.map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch the latest invoices.");
  }
}

export async function fetchCardData() {
  try {
    const invoiceCountPromise = query<{ count: number }[]>(
      `SELECT COUNT(*) AS count FROM invoices`
    );
    const customerCountPromise = query<{ count: number }[]>(
      `SELECT COUNT(*) AS count FROM customers`
    );
    const invoiceStatusPromise = query<{ paid: number; pending: number }[]>(`
      SELECT
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS paid,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS pending
      FROM invoices
    `);

    const [invoiceCountData, customerCountData, invoiceStatusData] =
      await Promise.all([
        invoiceCountPromise,
        customerCountPromise,
        invoiceStatusPromise,
      ]);

    const numberOfInvoices = invoiceCountData[0]?.count ?? 0;
    const numberOfCustomers = customerCountData[0]?.count ?? 0;
    const totalPaidInvoices = formatCurrency(invoiceStatusData[0]?.paid ?? 0);
    const totalPendingInvoices = formatCurrency(
      invoiceStatusData[0]?.pending ?? 0
    );

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch card data.");
  }
}

const ITEMS_PER_PAGE = 6;

export async function fetchFilteredInvoices(
  queryStr: string,
  currentPage: number
) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;
  const likeQuery = `%${queryStr.toLowerCase()}%`;

  try {
    const sql = `
    SELECT
      invoices.id,
      invoices.amount,
      invoices.date,
      invoices.status,
      customers.name,
      customers.email,
      customers.image_url
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE
      LOWER(customers.name) LIKE ? OR
      LOWER(customers.email) LIKE ? OR
      CAST(invoices.amount AS CHAR) LIKE ? OR
      CAST(invoices.date AS CHAR) LIKE ? OR
      LOWER(invoices.status) LIKE ?
    ORDER BY invoices.date DESC
    LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
  `;

    const invoices = await query<InvoicesTable[]>(sql, [
      likeQuery,
      likeQuery,
      likeQuery,
      likeQuery,
      likeQuery,
    ]);

    return invoices;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch invoices.");
  }
}

export async function fetchInvoicesPages(queryStr: string) {
  const likeQuery = `%${queryStr.toLowerCase()}%`;
  try {
    const data = await query<{ count: number }[]>(
      `
      SELECT COUNT(*) AS count
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      WHERE
        LOWER(customers.name) LIKE ? OR
        LOWER(customers.email) LIKE ? OR
        CAST(invoices.amount AS CHAR) LIKE ? OR
        CAST(invoices.date AS CHAR) LIKE ? OR
        LOWER(invoices.status) LIKE ?
    `,
      [likeQuery, likeQuery, likeQuery, likeQuery, likeQuery]
    );

    const totalPages = Math.ceil((data[0]?.count ?? 0) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch total number of invoices.");
  }
}

export async function fetchInvoiceById(id: string) {
  try {
    const data = await query<InvoiceForm[]>(
      `
      SELECT
        invoices.id,
        invoices.customer_id,
        invoices.amount,
        invoices.status
      FROM invoices
      WHERE invoices.id = ?
    `,
      [id]
    );

    if (data.length === 0) return null;

    const invoice = data[0];
    return {
      ...invoice,
      amount: invoice.amount / 100, // если сумма в центах
    };
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch invoice.");
  }
}

export async function fetchCustomers() {
  try {
    const customers = await query<CustomerField[]>(`
      SELECT
        id,
        name
      FROM customers
      ORDER BY name ASC
    `);

    return customers;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch all customers.");
  }
}

// export async function fetchFilteredCustomers(queryStr: string) {
//   const likeQuery = `%${queryStr.toLowerCase()}%`;
//   try {
//     const data = await query<CustomersTableType[]>(
//       `
//       SELECT
//         customers.id,
//         customers.name,
//         customers.email,
//         customers.image_url,
//         COUNT(invoices.id) AS total_invoices,
//         SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
//         SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
//       FROM customers
//       LEFT JOIN invoices ON customers.id = invoices.customer_id
//       WHERE
//         LOWER(customers.name) LIKE ? OR
//         LOWER(customers.email) LIKE ?
//       GROUP BY customers.id, customers.name, customers.email, customers.image_url
//       ORDER BY customers.name ASC
//     `,
//       [likeQuery, likeQuery]
//     );

//     return data.map((customer) => ({
//       ...customer,
//       total_pending: formatCurrency(customer.total_pending),
//       total_paid: formatCurrency(customer.total_paid),
//     }));
//   } catch (error) {
//     console.error("Database Error:", error);
//     throw new Error("Failed to fetch customer table.");
//   }
// }
