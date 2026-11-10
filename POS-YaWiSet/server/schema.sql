-- =========================================================
--  ยาวิเศษ POS — โครงสร้างฐานข้อมูล MySQL 8.x
--  เปิดไฟล์นี้ใน MySQL Workbench แล้วกด ⚡ Execute ได้เลย
--  (หรือรัน `npm run db:init` ซึ่งจะสร้างตาราง + ใส่ข้อมูลตัวอย่างให้)
-- =========================================================
CREATE DATABASE IF NOT EXISTS yawiset_pos
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE yawiset_pos;

-- ข้อมูลร้าน (มีแถวเดียว id = 1)
CREATE TABLE IF NOT EXISTS shop_settings (
  id           TINYINT PRIMARY KEY DEFAULT 1,
  shop_name    VARCHAR(200) NOT NULL,
  address      VARCHAR(500),
  phone        VARCHAR(50),
  tax_id       VARCHAR(30),
  license_shop VARCHAR(100),
  prompt_pay   VARCHAR(30),
  receipt_note VARCHAR(300)
) ENGINE=InnoDB;

-- พนักงาน / เภสัชกร (+ ข้อมูลใบประกอบวิชาชีพ)
CREATE TABLE IF NOT EXISTS staff (
  id              VARCHAR(20) PRIMARY KEY,
  title           VARCHAR(20)  NOT NULL,
  name            VARCHAR(150) NOT NULL,
  role            ENUM('admin','pharmacist','cashier') NOT NULL,
  pin_hash        VARCHAR(200) NOT NULL,
  color           VARCHAR(10)  DEFAULT '#1A7A6E',
  lic_no          VARCHAR(30)  NULL,
  lic_type        VARCHAR(150) NULL,
  lic_issued      DATE NULL,
  lic_expires     DATE NULL,
  lic_university  VARCHAR(200) NULL,
  lic_degree      VARCHAR(150) NULL,
  active          TINYINT(1) NOT NULL DEFAULT 1,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_staff_lic (lic_no)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS customers (
  id         VARCHAR(20) PRIMARY KEY,
  name       VARCHAR(150) NOT NULL,
  phone      VARCHAR(30),
  allergies  VARCHAR(500),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
  id         VARCHAR(20) PRIMARY KEY,
  barcode    VARCHAR(40) NOT NULL,
  name       VARCHAR(200) NOT NULL,
  generic    VARCHAR(200),
  category   VARCHAR(60) NOT NULL,
  unit       VARCHAR(30) NOT NULL,
  price      DECIMAL(10,2) NOT NULL DEFAULT 0,
  cost       DECIMAL(10,2) NOT NULL DEFAULT 0,
  min_stock  INT NOT NULL DEFAULT 0,
  dosage     TEXT,
  active     TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_barcode (barcode)
) ENGINE=InnoDB;

-- สต็อกแยกตาม Lot / วันหมดอายุ
CREATE TABLE IF NOT EXISTS product_lots (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  product_id  VARCHAR(20) NOT NULL,
  lot_no      VARCHAR(50) NOT NULL,
  exp         DATE NOT NULL,
  qty         INT NOT NULL DEFAULT 0,
  received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_lot (product_id, lot_no, exp),
  KEY ix_exp (exp),
  CONSTRAINT fk_lot_product FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS receipts (
  id            VARCHAR(20) PRIMARY KEY,
  no            VARCHAR(30) NOT NULL,
  at            DATETIME NOT NULL,            -- เก็บเป็นเวลา UTC
  customer_id   VARCHAR(20) NULL,
  staff_id      VARCHAR(20) NOT NULL,
  pharmacist_id VARCHAR(20) NULL,
  rx_no         VARCHAR(50) NULL,
  prescriber    VARCHAR(150) NULL,
  subtotal      DECIMAL(10,2) NOT NULL,
  discount      DECIMAL(10,2) NOT NULL DEFAULT 0,
  total         DECIMAL(10,2) NOT NULL,
  payment       ENUM('cash','qr','card') NOT NULL,
  received      DECIMAL(10,2) NOT NULL,
  change_amt    DECIMAL(10,2) NOT NULL DEFAULT 0,
  voided        TINYINT(1) NOT NULL DEFAULT 0,
  void_reason   VARCHAR(300) NULL,
  void_at       DATETIME NULL,
  UNIQUE KEY uq_receipt_no (no),
  KEY ix_receipt_at (at),
  CONSTRAINT fk_r_staff FOREIGN KEY (staff_id) REFERENCES staff(id),
  CONSTRAINT fk_r_pharm FOREIGN KEY (pharmacist_id) REFERENCES staff(id),
  CONSTRAINT fk_r_cust  FOREIGN KEY (customer_id) REFERENCES customers(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS receipt_items (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  receipt_id  VARCHAR(20) NOT NULL,
  product_id  VARCHAR(20) NOT NULL,
  name        VARCHAR(200) NOT NULL,
  category    VARCHAR(60) NOT NULL,
  unit        VARCHAR(30) NOT NULL,
  price       DECIMAL(10,2) NOT NULL,
  cost        DECIMAL(10,2) NOT NULL,
  qty         INT NOT NULL,
  dosage      TEXT,
  CONSTRAINT fk_ri_receipt FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE,
  CONSTRAINT fk_ri_product FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

-- ยาแต่ละรายการตัดจาก Lot ไหนเท่าไร (ใช้คืนสต็อกตอนยกเลิกบิล)
CREATE TABLE IF NOT EXISTS receipt_item_lots (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  receipt_item_id INT NOT NULL,
  lot_no          VARCHAR(50) NOT NULL,
  exp             DATE NOT NULL,
  qty             INT NOT NULL,
  CONSTRAINT fk_ril_item FOREIGN KEY (receipt_item_id) REFERENCES receipt_items(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ความเคลื่อนไหวสต็อก: รับเข้า / ขาย / ตัดจำหน่าย / ยกเลิกบิล / ปรับยอด
CREATE TABLE IF NOT EXISTS stock_moves (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  at          DATETIME NOT NULL,
  type        ENUM('receive','sale','write_off','void','adjust') NOT NULL,
  product_id  VARCHAR(20) NOT NULL,
  name        VARCHAR(200) NOT NULL,
  lot_no      VARCHAR(200),
  exp         DATE NULL,
  qty         INT NOT NULL,                 -- + เข้า / - ออก
  ref         VARCHAR(100),                 -- เลขใบเสร็จ / เลขใบส่งของ
  note        VARCHAR(300),
  staff_id    VARCHAR(20) NULL,
  KEY ix_move_at (at),
  KEY ix_move_product (product_id)
) ENGINE=InnoDB;

-- มุมมองสต็อกคงเหลือ (ดูใน Workbench: SELECT * FROM v_stock;)
CREATE OR REPLACE VIEW v_stock AS
SELECT p.id, p.barcode, p.name, p.category, p.unit, p.min_stock,
       COALESCE(SUM(CASE WHEN l.exp >= CURDATE() THEN l.qty END), 0) AS stock_ok,
       COALESCE(SUM(CASE WHEN l.exp <  CURDATE() THEN l.qty END), 0) AS stock_expired,
       MIN(CASE WHEN l.exp >= CURDATE() AND l.qty > 0 THEN l.exp END) AS next_exp
FROM products p LEFT JOIN product_lots l ON l.product_id = p.id
WHERE p.active = 1
GROUP BY p.id;
