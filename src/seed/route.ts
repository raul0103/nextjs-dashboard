import mysql from "mysql2/promise";
import { v4 as uuidv4 } from "uuid";
import {
  invoices,
  customers,
  revenue,
  users,
} from "@/src/lib/placeholder-data";

const connection = await mysql.createConnection({
  host: process.env.MYSQL_HOST!,
  user: process.env.MYSQL_USER!,
  password: process.env.MYSQL_PASSWORD!,
  database: process.env.MYSQL_DATABASE!,
});

async function seedUsers() {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id CHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password TEXT NOT NULL
    );
  `);

  for (const user of users) {
    const id = user.id || uuidv4();
    const hashedPassword = "xxx"; // подставь хеш, если надо
    await connection.execute(
      `INSERT IGNORE INTO users (id, name, email, password) VALUES (?, ?, ?, ?)`,
      [id, user.name, user.email, hashedPassword]
    );
  }
}

async function seedCustomers() {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS customers (
      id CHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      image_url VARCHAR(255) NOT NULL
    );
  `);

  for (const customer of customers) {
    const id = customer.id || uuidv4();
    await connection.execute(
      `INSERT IGNORE INTO customers (id, name, email, image_url) VALUES (?, ?, ?, ?)`,
      [id, customer.name, customer.email, customer.image_url]
    );
  }
}

async function seedInvoices() {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS invoices (
      id CHAR(36) PRIMARY KEY,
      customer_id CHAR(36) NOT NULL,
      amount INT NOT NULL,
      status VARCHAR(255) NOT NULL,
      date DATE NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );
  `);

  let index = 1;
  for (const invoice of invoices) {
    await connection.execute(
      `INSERT IGNORE INTO invoices (id,customer_id, amount, status, date) VALUES (?, ?, ?, ?, ?)`,
      [
        index++,
        invoice.customer_id,
        invoice.amount,
        invoice.status,
        invoice.date,
      ]
    );
  }
}

async function seedRevenue() {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS revenue (
      month VARCHAR(4) NOT NULL UNIQUE,
      revenue INT NOT NULL
    );
  `);

  for (const rev of revenue) {
    await connection.execute(
      `INSERT IGNORE INTO revenue (month, revenue) VALUES (?, ?)`,
      [rev.month, rev.revenue]
    );
  }
}

export async function GET() {
  try {
    await seedUsers();
    await seedCustomers();
    await seedRevenue();
    await seedInvoices();

    return Response.json({ message: "Database seeded successfully" });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  } finally {
    await connection.end();
  }
}
