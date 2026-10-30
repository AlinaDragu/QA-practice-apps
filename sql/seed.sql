-- DemoShop: schema and starting data. server.js loads this file on every start and reset.

CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  first_name TEXT NOT NULL COLLATE NOCASE,
  last_name TEXT NOT NULL COLLATE NOCASE,
  email TEXT COLLATE NOCASE,
  phone TEXT,
  city TEXT COLLATE NOCASE,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE,
  category TEXT COLLATE NOCASE,
  price REAL NOT NULL,
  stock INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  order_date TEXT NOT NULL,
  status TEXT NOT NULL COLLATE NOCASE,
  shipping REAL NOT NULL,
  total REAL NOT NULL
);

CREATE TABLE order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL
);

CREATE TABLE payments (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  method TEXT NOT NULL COLLATE NOCASE,
  status TEXT NOT NULL COLLATE NOCASE,
  paid_at TEXT NOT NULL
);

INSERT INTO customers (id, first_name, last_name, email, phone, city, is_active, created_at) VALUES
  (1, 'Andrei', 'Ionescu', 'andrei.ionescu@mail.ro', '0722100001', 'București', 1, '2025-02-11'),
  (2, 'Maria', 'Popa', 'maria.popa@mail.ro', '0722100002', 'Cluj-Napoca', 1, '2025-03-02'),
  (3, 'Elena', 'Stan', 'elena.stan@mail.ro', '0722100003', 'Iași', 1, '2025-03-19'),
  (4, 'Mihai', 'Dumitru', 'mihai.dumitru@mail.ro', '0722100004', 'Timișoara', 1, '2025-04-05'),
  (5, 'Ioana', 'Marin', 'ioana.marin@mail.ro', '0722100005', 'Brașov', 1, '2025-04-21'),
  (6, 'Cristian', 'Radu', 'cristian.radu@mail.ro', '0722100006', 'București', 1, '2025-05-08'),
  (7, 'Ana', 'Georgescu', 'ana.georgescu@mail.ro', '0722100007', 'Constanța', 1, '2025-05-27'),
  (8, 'Vlad', 'Stoica', 'vlad.stoica@mail.ro', '0722100008', 'Cluj-Napoca', 0, '2025-06-14'),
  (9, 'Raluca', 'Munteanu', 'raluca.munteanu@mail.ro', '0722100009', 'Sibiu', 1, '2025-07-01'),
  (10, 'Ion', 'Popescu', 'ion.popescu@mail.ro', '0722100010', 'București', 1, '2025-07-18'),
  (11, 'Ion', 'Popescu', 'ion.popescu84@mail.ro', '0722100011', 'Oradea', 1, '2025-08-03'),
  (12, 'Gabriela', 'Lupu', 'gabriela.lupu@mail.ro', '0722100012', 'Iași', 1, '2025-08-22'),
  (13, 'Sorin', 'Neagu', 'andrei.ionescu@mail.ro', '0722100013', 'Craiova', 1, '2025-09-09'),  -- BUG 1
  (14, 'Diana', 'Florea', 'diana.florea@mail.ro', '0722100014', 'Brașov', 1, '2025-09-30'),
  (15, 'Paul', 'Matei', NULL, '0722100015', 'București', 1, '2025-10-12'),  -- BUG 2
  (16, 'Laura', 'Ene', '', '0722100016', 'Galați', 1, '2025-11-02'),  -- BUG 2
  (17, 'Bogdan', 'Barbu', 'bogdan.barbu.mail.ro', '0722100017', 'Ploiești', 1, '2025-11-20'),  -- BUG 3
  (18, 'Oana', 'Tudor', 'oana.tudor@', '0722100018', 'Cluj-Napoca', 1, '2025-12-08'),  -- BUG 3
  (19, 'Alexandru', 'Dobre', 'alexandru.dobre@mail.ro', '0722100019', 'Timișoara', 0, '2026-01-15'),
  (20, 'Simona', 'Preda', 'simona.preda@mail.ro', '0722100020', 'Sibiu', 1, '2026-02-03'),
  (21, 'Tudor', 'Văduva', 'maria.popa@mail.ro', '0722100021', 'Arad', 1, '2026-03-11'),  -- BUG 1
  (22, 'Bianca', 'Constantin', 'bianca.constantin@mail.ro', '0722100022', 'București', 1, '2026-04-17'),
  (23, 'Radu', 'Moldovan', 'radu.moldovan@mail.ro', '0722100023', 'Cluj-Napoca', 1, '2026-06-02'),
  (24, 'Irina', 'Oprea', 'irina.oprea@mail.ro', '0722100024', 'Iași', 1, '2026-08-19');

INSERT INTO products (id, name, category, price, stock, is_active) VALUES
  (1, 'Căști wireless', 'Audio', 249.00, 34, 1),
  (2, 'Boxă portabilă', 'Audio', 179.50, 21, 1),
  (3, 'Mouse optic', 'Periferice', 59.50, 80, 1),
  (4, 'Tastatură mecanică', 'Periferice', 329.00, 15, 1),
  (5, 'Monitor 24 inch', 'Monitoare', 749.00, 9, 1),
  (6, 'Monitor 27 inch', 'Monitoare', 1199.00, 4, 1),
  (7, 'Cablu HDMI 2m', 'Accesorii', 29.50, 120, 1),
  (8, 'Hub USB-C', 'Accesorii', 119.00, 40, 1),
  (9, 'Suport laptop', 'Accesorii', 99.50, 27, 1),
  (10, 'Webcam HD', 'Periferice', 199.00, 12, 1),
  (11, 'SSD extern 1TB', 'Stocare', 449.00, 18, 1),
  (12, 'Stick USB 64GB', 'Stocare', 39.50, 200, 1),
  (13, 'Încărcător GaN 65W', 'Accesorii', 149.50, 33, 1),
  (14, 'Rucsac laptop', 'Accesorii', 169.00, 14, 1),
  (15, 'Căști cu fir', 'Audio', 69.00, 0, 1),
  (16, 'Cameră supraveghere', 'Smart Home', 219.00, -3, 1),  -- BUG 5
  (17, 'Bec inteligent', 'Smart Home', 49.50, -1, 1),  -- BUG 5
  (18, 'Priză inteligentă', 'Smart Home', 0.00, 25, 1),  -- BUG 4
  (19, 'Lampă de birou', 'Accesorii', 100.00, 30, 1),
  (20, 'Telecomandă universală', 'Accesorii', 39.00, 6, 0);

INSERT INTO orders (id, customer_id, order_date, status, shipping, total) VALUES
  (1001, 1, '2025-03-04', 'delivered', 0.00, 308.00),
  (1002, 2, '2025-03-20', 'delivered', 15.00, 74.50),
  (1003, 3, '2025-04-12', 'delivered', 0.00, 449.00),
  (1004, 4, '2025-05-02', 'delivered', 0.00, 388.50),
  (1005, 5, '2025-05-30', 'delivered', 15.00, 133.50),
  (1006, 6, '2025-06-18', 'delivered', 0.00, 778.50),
  (1007, 7, '2025-07-07', 'cancelled', 15.00, 194.50),
  (1008, 8, '2025-07-22', 'delivered', 0.00, 218.50),
  (1009, 9, '2025-08-11', 'delivered', 0.00, 229.00),
  (1010, 10, '2025-09-01', 'delivered', 0.00, 299.00),
  (1011, 11, '2025-09-14', 'delivered', 15.00, 184.00),
  (1012, 12, '2025-10-03', 'delivered', 0.00, 1258.00),
  (1013, 14, '2025-10-20', 'delivered', 15.00, 214.00),
  (1014, 1, '2025-11-11', 'delivered', 0.00, 200.00),
  (1015, 2, '2025-11-28', 'delivered', 0.00, 699.00),
  (1016, 31, '2025-12-02', 'delivered', 15.00, 74.50),  -- BUG 7
  (1017, 3, '2025-12-05', 'delivered', 15.00, 173.50),
  (1018, 4, '2025-12-12', 'delivered', 15.00, 179.50),  -- BUG 11
  (1019, 6, '2025-12-19', 'delivered', 0.00, 568.00),
  (1020, 9, '2026-01-09', 'delivered', 0.00, 359.00),
  (1021, 7, '2026-01-18', 'delivered', 15.00, 194.50),  -- BUG 9
  (1022, 12, '2026-01-25', 'cancelled', 0.00, 329.00),
  (1023, 1, '2026-02-02', 'delivered', 0.00, 329.00),  -- BUG 14
  (1024, 20, '2026-02-14', 'delivered', 15.00, 194.00),
  (1025, 21, '2026-02-20', 'delivered', 15.00, 164.50),  -- BUG 13
  (1026, 5, '2026-02-22', 'delivered', 15.00, 129.00),  -- BUG 8
  (1027, 4, '2026-03-01', 'delivered', 15.00, 214.00),
  (1028, 3, '2026-03-09', 'delivered', 0.00, 298.50),
  (1029, 10, '2026-03-17', 'delivered', 0.00, 428.50),
  (1030, 14, '2026-03-23', 'delivered', 0.00, 228.00),  -- BUG 11
  (1031, 5, '2026-04-02', 'delivered', 0.00, 438.00),
  (1032, 9, '2026-04-11', 'delivered', 15.00, 204.50),  -- BUG 9
  (1033, 20, '2026-04-26', 'cancelled', 0.00, 749.00),  -- BUG 16
  (1034, 22, '2026-04-29', 'delivered', 15.00, 213.00),
  (1035, 32, '2026-05-03', 'delivered', 15.00, 54.50),  -- BUG 7
  (1036, 1, '2026-05-09', 'delivered', 15.00, 244.50),  -- BUG 12
  (1037, 14, '2026-05-16', 'delivered', 0.00, 1199.00),
  (1038, 2, '2026-05-24', 'delivered', 0.00, 398.00),  -- BUG 15
  (1039, 20, '2026-06-08', 'delivered', 15.00, 213.00),
  (1040, 12, '2026-06-17', 'delivered', 0.00, 309.00),  -- BUG 11
  (1041, 23, '2026-06-30', 'delivered', 0.00, 578.00),
  (1042, 23, '2026-07-04', 'paid', 15.00, 59.50),  -- BUG 8
  (1043, 10, '2026-07-11', 'delivered', 0.00, 318.50),
  (1044, 14, '2026-07-28', 'delivred', 15.00, 74.50),  -- BUG 6
  (1045, 7, '2026-08-02', 'delivered', 0.00, 268.50),
  (1046, 11, '2026-08-09', 'delivered', 0.00, 449.00),  -- BUG 15
  (1047, 6, '2026-08-15', 'delivred', 0.00, 249.00),  -- BUG 6
  (1048, 23, '2026-08-24', 'delivered', 0.00, 449.00),
  (1049, 5, '2026-08-30', 'delivered', 0.00, 338.00),  -- BUG 10
  (1050, 22, '2026-09-03', 'delivered', 0.00, 749.00),  -- BUG 14
  (1051, 3, '2026-09-12', 'delivered', 0.00, 228.50),
  (1052, 23, '2026-09-29', 'pending', 15.00, 94.00),  -- BUG 6
  (1053, 9, '2026-10-02', 'shipped', 0.00, 749.00),
  (1054, 10, '2026-10-14', 'shipped', 15.00, 114.00),
  (1055, 6, '2026-10-21', 'paid', 15.00, 164.50),
  (1056, 20, '2026-10-25', 'paid', 0.00, 219.00),
  (1057, 22, '2026-10-27', 'new', 0.00, 249.00),
  (1058, 2, '2026-10-28', 'new', 15.00, 103.50),
  (1059, 6, '2026-11-14', 'paid', 15.00, 44.50);  -- BUG 13

INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES
  (1, 1001, 1, 1, 249.00),
  (2, 1001, 7, 2, 29.50),
  (3, 1002, 3, 1, 59.50),
  (4, 1003, 11, 1, 449.00),
  (5, 1004, 4, 1, 329.00),
  (6, 1004, 3, 1, 59.50),
  (7, 1005, 12, 3, 39.50),
  (8, 1006, 5, 1, 749.00),
  (9, 1006, 7, 1, 29.50),
  (10, 1007, 2, 1, 179.50),
  (11, 1008, 9, 1, 99.50),
  (12, 1008, 8, 1, 119.00),
  (13, 1009, 1, 1, 229.00),
  (14, 1010, 13, 2, 149.50),
  (15, 1011, 14, 1, 169.00),
  (16, 1012, 6, 1, 1199.00),
  (17, 1012, 7, 2, 29.50),
  (18, 1013, 10, 1, 199.00),
  (19, 1014, 19, 2, 100.00),
  (20, 1015, 5, 1, 699.00),
  (21, 1016, 3, 1, 59.50),
  (22, 1017, 3, 2, 59.50),
  (23, 1017, 12, 1, 39.50),
  (24, 1018, 2, 1, 179.50),
  (25, 1019, 11, 1, 449.00),
  (26, 1019, 8, 1, 119.00),
  (27, 1020, 2, 2, 179.50),
  (28, 1021, 2, 1, 179.50),
  (29, 1021, 7, 0, 29.50),  -- BUG 9
  (30, 1022, 4, 1, 329.00),
  (31, 1023, 4, 1, 329.00),
  (32, 1024, 13, 1, 149.50),
  (33, 1024, 7, 1, 29.50),
  (34, 1025, 13, 1, 149.50),
  (35, 1027, 9, 2, 99.50),
  (36, 1028, 9, 3, 99.50),
  (37, 1029, 1, 1, 249.00),
  (38, 1029, 2, 1, 179.50),
  (39, 1030, 8, 2, 119.00),
  (40, 1031, 16, 2, 219.00),
  (41, 1032, 1, 1, 249.00),
  (42, 1032, 3, -1, 59.50),  -- BUG 9
  (43, 1033, 5, 1, 749.00),
  (44, 1034, 17, 4, 49.50),
  (45, 1035, 12, 1, 39.50),
  (46, 1036, 19, 2, 100.00),
  (47, 1036, 7, 1, 29.50),
  (48, 1037, 6, 1, 1199.00),
  (49, 1038, 10, 2, 199.00),
  (50, 1039, 8, 1, 119.00),
  (51, 1039, 12, 2, 39.50),
  (52, 1040, 1, 1, 249.00),
  (53, 1040, 3, 1, 59.50),
  (54, 1041, 4, 1, 329.00),
  (55, 1041, 1, 1, 249.00),
  (56, 1043, 13, 1, 149.50),
  (57, 1043, 14, 1, 169.00),
  (58, 1044, 3, 1, 59.50),
  (59, 1045, 14, 1, 169.00),
  (60, 1045, 9, 1, 99.50),
  (61, 1046, 11, 1, 449.00),
  (62, 1047, 1, 1, 249.00),
  (63, 1048, 11, 1, 449.00),
  (64, 1049, 1, 1, 249.00),
  (65, 1049, 77, 1, 89.00),  -- BUG 10
  (66, 1050, 5, 1, 749.00),
  (67, 1051, 10, 1, 199.00),
  (68, 1051, 7, 1, 29.50),
  (69, 1052, 12, 2, 39.50),
  (70, 1053, 5, 1, 749.00),
  (71, 1054, 3, 1, 59.50),
  (72, 1054, 12, 1, 39.50),
  (73, 1055, 13, 1, 149.50),
  (74, 1056, 16, 1, 219.00),
  (75, 1057, 1, 1, 249.00),
  (76, 1058, 7, 3, 29.50),
  (77, 1059, 7, 1, 29.50);

INSERT INTO payments (id, order_id, amount, method, status, paid_at) VALUES
  (5001, 1001, 308.00, 'card', 'success', '2025-03-04 10:00:12'),
  (5002, 1002, 74.50, 'card', 'success', '2025-03-20 10:01:12'),
  (5003, 1003, 449.00, 'ramburs', 'success', '2025-04-12 10:02:12'),
  (5004, 1004, 388.50, 'transfer', 'success', '2025-05-02 10:03:12'),
  (5005, 1005, 133.50, 'card', 'success', '2025-05-30 10:04:12'),
  (5006, 1006, 778.50, 'card', 'success', '2025-06-18 10:05:12'),
  (5007, 1008, 218.50, 'transfer', 'success', '2025-07-22 10:07:12'),
  (5008, 1009, 229.00, 'card', 'success', '2025-08-11 10:08:12'),
  (5009, 1010, 299.00, 'card', 'success', '2025-09-01 10:09:12'),
  (5010, 1011, 184.00, 'ramburs', 'success', '2025-09-14 10:10:12'),
  (5011, 1012, 1258.00, 'transfer', 'success', '2025-10-03 10:11:12'),
  (5012, 1013, 214.00, 'card', 'success', '2025-10-20 10:12:12'),
  (5013, 1014, 200.00, 'card', 'success', '2025-11-11 10:13:12'),
  (5014, 1015, 699.00, 'ramburs', 'success', '2025-11-28 10:14:12'),
  (5015, 1016, 74.50, 'transfer', 'success', '2025-12-02 10:15:12'),
  (5016, 1017, 173.50, 'card', 'success', '2025-12-05 10:16:12'),
  (5017, 1018, 179.50, 'card', 'success', '2025-12-12 10:17:12'),
  (5018, 1019, 568.00, 'ramburs', 'success', '2025-12-19 10:18:12'),
  (5019, 1020, 359.00, 'transfer', 'success', '2026-01-09 10:19:12'),
  (5020, 1021, 194.50, 'card', 'success', '2026-01-18 10:20:12'),
  (5021, 1022, 329.00, 'card', 'refunded', '2026-01-25 10:21:12'),
  (5022, 1023, 329.00, 'ramburs', 'success', '2026-02-02 10:22:12'),  -- BUG 14
  (5023, 1023, 329.00, 'ramburs', 'success', '2026-02-02 10:22:13'),  -- BUG 14
  (5024, 1024, 194.00, 'transfer', 'success', '2026-02-14 10:23:12'),
  (5025, 1025, 164.50, 'card', 'success', '2026-02-20 10:24:12'),
  (5026, 1026, 129.00, 'card', 'success', '2026-02-22 10:25:12'),
  (5027, 1027, 214.00, 'ramburs', 'success', '2026-03-01 10:26:12'),
  (5028, 1028, 298.50, 'card', 'failed', '2026-03-09 09:27:40'),
  (5029, 1028, 298.50, 'card', 'success', '2026-03-09 10:27:12'),
  (5030, 1029, 428.50, 'card', 'success', '2026-03-17 10:28:12'),
  (5031, 1030, 228.00, 'card', 'success', '2026-03-23 10:29:12'),
  (5032, 1031, 438.00, 'ramburs', 'success', '2026-04-02 10:30:12'),
  (5033, 1032, 204.50, 'transfer', 'success', '2026-04-11 10:31:12'),
  (5034, 1033, 749.00, 'card', 'success', '2026-04-26 10:32:12'),  -- BUG 16
  (5035, 1034, 213.00, 'card', 'success', '2026-04-29 10:33:12'),
  (5036, 1035, 54.50, 'ramburs', 'success', '2026-05-03 10:34:12'),
  (5037, 1036, 244.50, 'transfer', 'success', '2026-05-09 10:35:12'),
  (5038, 1037, 1199.00, 'card', 'success', '2026-05-16 10:36:12'),
  (5039, 1039, 213.00, 'ramburs', 'success', '2026-06-08 10:38:12'),
  (5040, 1040, 309.00, 'transfer', 'success', '2026-06-17 10:39:12'),
  (5041, 1041, 578.00, 'card', 'success', '2026-06-30 10:40:12'),
  (5042, 1042, 59.50, 'card', 'success', '2026-07-04 10:41:12'),
  (5043, 1043, 318.50, 'card', 'failed', '2026-07-11 09:42:40'),
  (5044, 1043, 318.50, 'card', 'success', '2026-07-11 10:42:12'),
  (5045, 1044, 74.50, 'transfer', 'success', '2026-07-28 10:43:12'),
  (5046, 1045, 268.50, 'card', 'success', '2026-08-02 10:44:12'),
  (5047, 1046, 399.00, 'card', 'success', '2026-08-09 10:45:12'),  -- BUG 15
  (5048, 1047, 249.00, 'ramburs', 'success', '2026-08-15 10:46:12'),
  (5049, 1048, 449.00, 'transfer', 'success', '2026-08-24 10:47:12'),
  (5050, 1049, 338.00, 'card', 'success', '2026-08-30 10:48:12'),
  (5051, 1050, 749.00, 'card', 'success', '2026-09-03 10:49:12'),  -- BUG 14
  (5052, 1050, 749.00, 'card', 'success', '2026-09-03 10:49:13'),  -- BUG 14
  (5053, 1051, 228.50, 'ramburs', 'success', '2026-09-12 10:50:12'),
  (5054, 1053, 749.00, 'card', 'success', '2026-10-02 10:52:12'),
  (5055, 1054, 114.00, 'card', 'success', '2026-10-14 10:53:12'),
  (5056, 1055, 164.50, 'ramburs', 'success', '2026-10-21 10:54:12'),
  (5057, 1056, 219.00, 'transfer', 'success', '2026-10-25 10:55:12'),
  (5058, 1059, 44.50, 'ramburs', 'success', '2026-11-14 10:58:12');
