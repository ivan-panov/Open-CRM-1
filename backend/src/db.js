import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const {
  MYSQL_HOST = 'localhost',
  MYSQL_PORT = 3306,
  MYSQL_USER = 'root',
  MYSQL_PASSWORD = '',
  MYSQL_DATABASE = 'open_crm'
} = process.env;

const pool = mysql.createPool({
  host: MYSQL_HOST,
  port: MYSQL_PORT,
  user: MYSQL_USER,
  password: MYSQL_PASSWORD,
  database: MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export const getConnection = () => pool.getConnection();
export const query = (...params) => pool.query(...params);
export default pool;
