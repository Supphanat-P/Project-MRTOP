import { useMemo, useState } from "react";
import { useStore } from "../store.jsx";
import {
  baht,
  CATEGORIES,
  CATEGORY_INFO,
  fmtPhone,
  licenseStatus,
  matchMember,
  blankMember,
  memberStats,
  PHARMACIST_ONLY,
  stockOf,
  thDate,
} from "../utils.js";
import { Badge, CatIcon, CatTag, Field, Modal } from "../components/ui.jsx";
import ReceiptView, { DrugLabel } from "../components/ReceiptView.jsx";
import MemberForm from "../components/MemberForm.jsx";
import PrintButtons from "../components/PrintButtons.jsx";
import { labelsDoc, receiptDoc } from "../pdf.js";

function MemberPicker({ customer, onPick }) {
  const { state, act, busy } = useStore();
  const [q, setQ] = useState("");
  const [form, setForm] = useState(null);
  const hits = q.trim()
    ? state.customers.filter((c) => matchMember(c, q)).slice(0, 6)
    : [];
  const pick = (id) => {
    onPick(id);
    setQ("");
  };
  const isMember = !!customer?.memberNo;
  const st = isMember ? memberStats(state.receipts, customer.id) : null;

  return (
    <div className="field member-pick">
      <span>ลูกค้า / สมาชิก</span>
      {isMember ? (
        <div className="member-card">
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>{customer.name}</b> <Badge cls="ok">{customer.memberNo}</Badge>
            <br />
            <small className="muted">
              {fmtPhone(customer.phone)} · ซื้อแล้ว {st.visits} ครั้ง{" "}
              {baht(st.total)}
              {st.last ? ` · ล่าสุด ${thDate(st.last)}` : ""}
            </small>
          </div>
          <button className="btn sm ghost" onClick={() => onPick("c1")}>
            เปลี่ยน
          </button>
        </div>
      ) : (
        <>
          <div className="row" style={{ gap: 8 }}>
            <div className="search" style={{ minWidth: 0 }}>
              <input
                placeholder="เบอร์โทร / ชื่อ / รหัสสมาชิก"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && hits[0]) pick(hits[0].id);
                  if (e.key === "Escape") setQ("");
                }}
              />
            </div>
            <button className="btn sm" onClick={() => setForm(blankMember(q))}>
              ＋ สมัครสมาชิก
            </button>
          </div>
          {q.trim() && (
            <div className="member-hits">
              {hits.map((c) => (
                <button key={c.id} onClick={() => pick(c.id)}>
                  <span>
                    <b>{c.name}</b>
                    <br />
                    <small className="muted">
                      {c.memberNo} · {fmtPhone(c.phone)}
                    </small>
                  </span>
                  {c.allergies && <Badge cls="danger">แพ้ยา</Badge>}
                </button>
              ))}
              {!hits.length && (
                <div className="empty small">ไม่พบสมาชิก</div>
              )}
            </div>
          )}
          {!q.trim() && (
            <small className="muted">ตอนนี้: ลูกค้าทั่วไป (ไม่ใช่สมาชิก)</small>
          )}
        </>
      )}
      {form && (
        <MemberForm
          initial={form}
          busy={busy}
          onClose={() => setForm(null)}
          onSave={async (m) => {
            const r = await act("saveCustomer", m, "สมัครสมาชิกแล้ว");
            if (r) {
              setForm(null);
              pick(r.id);
            }
          }}
        />
      )}
    </div>
  );
}

export default function POS() {
  const { state, act, me, busy, notify } = useStore();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [cart, setCart] = useState([]);
  const [customerId, setCustomerId] = useState("c1");
  const pharmacistId = me?.id || "";
  const [rxNo, setRxNo] = useState("");
  const [prescriber, setPrescriber] = useState("");
  const [discount, setDiscount] = useState("");
  const [payment, setPayment] = useState("cash");
  const [received, setReceived] = useState("");
  const [done, setDone] = useState(null);
  const [printMode, setPrintMode] = useState("receipt");
  const found = useMemo(() => {
    const k = q.trim().toLowerCase();
    return state.products.filter(
      (p) =>
        (!cat || p.category === cat) &&
        (!k ||
          p.name.toLowerCase().includes(k) ||
          p.generic.toLowerCase().includes(k) ||
          p.barcode.includes(k)),
    );
  }, [state.products, q, cat]);

  const add = (p, n = 1) => {
    const have = cart.find((c) => c.productId === p.id)?.qty || 0;
    if (have + n > stockOf(p))
      return notify(
        `${p.name} มีสต็อกพร้อมขาย ${stockOf(p)} ${p.unit}`,
        "danger",
      );
    setCart(
      have
        ? cart.map((c) => (c.productId === p.id ? { ...c, qty: c.qty + n } : c))
        : [...cart, { productId: p.id, qty: n }],
    );
  };
  const setQty = (id, v) => {
    const p = state.products.find((x) => x.id === id);
    const n = Math.min(Math.max(parseInt(v) || 0, 0), stockOf(p));
    setCart(
      n
        ? cart.map((c) => (c.productId === id ? { ...c, qty: n } : c))
        : cart.filter((c) => c.productId !== id),
    );
  };

  const onScan = (e) => {
    if (e.key !== "Enter") return;
    const p =
      state.products.find((x) => x.barcode === q.trim()) ||
      (found.length === 1 ? found[0] : null);
    if (p) {
      add(p);
      setQ("");
    }
  };

  const lines = cart
    .map((c) => ({ ...c, p: state.products.find((p) => p.id === c.productId) }))
    .filter((l) => l.p);
  const subtotal = lines.reduce((s, l) => s + l.p.price * l.qty, 0);
  const disc = Math.min(Number(discount) || 0, subtotal);
  const total = subtotal - disc;
  const change = (Number(received) || 0) - total;
  const needPharm = lines.some((l) => PHARMACIST_ONLY.includes(l.p.category));
  const needRx = lines.some((l) => l.p.category === "ยาควบคุมพิเศษ");
  const cust = state.customers.find((c) => c.id === customerId);

  const checkout = async () => {
    if (!lines.length) return notify("ยังไม่มีสินค้าในตะกร้า", "danger");
    if (needPharm) {
      if (!me?.license || licenseStatus(me.license).key === "expired") {
        return notify(
          "มียาอันตราย/ยาควบคุมพิเศษ ผู้ใช้งานที่เข้าสู่ระบบต้องมีใบประกอบวิชาชีพเภสัชกรรมที่ยังไม่หมดอายุ",
          "danger",
        );
      }
    }
    if (needRx && (!rxNo.trim() || !prescriber.trim()))
      return notify("ยาควบคุมพิเศษต้องระบุเลขใบสั่งยาและชื่อแพทย์ในกล่องรายการยา", "danger");
    if (payment === "cash" && change < 0)
      return notify("รับเงินไม่พอ", "danger");
    const res = await act("checkout", {
      cart: cart.map(({ productId, qty }) => ({ productId, qty })),
      receipt: {
        customerId,
        pharmacistId: me?.id || null,
        rxNo: needRx ? rxNo.trim() : null,
        prescriber: needRx ? prescriber.trim() : null,
        discount: disc,
        payment,
        received: payment === "cash" ? Number(received) : total,
      },
    });
    if (!res) return;
    setDone(res.id);
    setCart([]);
    setDiscount("");
    setReceived("");
    setRxNo("");
    setPrescriber("");
    setCustomerId("c1");
  };

  const doneReceipt = state.receipts.find((r) => r.id === done);
  const quick = [20, 50, 100, 500, 1000].filter((v) => v >= total);

  return (
    <div className="page">
      <div className="pos">
        <section>
          <div className="section-label">Point of Sale</div>
          <h1 className="section-title">
            ขายหน้า<em>ร้าน</em>
          </h1>
          <div className="row" style={{ marginTop: 16 }}>
            <div className="search">
              <input
                autoFocus
                placeholder="ค้นหาชื่อยา / ชื่อสามัญ / สแกนบาร์โค้ดแล้วกด Enter"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onScan}
              />
            </div>
          </div>
          <div className="seg" style={{ marginTop: 12 }}>
            <button className={!cat ? "on" : ""} onClick={() => setCat("")}>
              ทั้งหมด
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                className={cat === c ? "on" : ""}
                onClick={() => setCat(c)}
              >
                <CatIcon category={c} size={12} />
                <span style={{ marginLeft: 5 }}>{c}</span>
              </button>
            ))}
          </div>
          <div className="prod-grid">
            {found.map((p) => {
              const st = stockOf(p);
              const isControlled = p.category === "ยาควบคุมพิเศษ";
              const isDangerous = p.category === "ยาอันตราย";
              return (
                <button
                  key={p.id}
                  className={`prod ${isControlled ? "prod-controlled" : isDangerous ? "prod-danger" : ""}`}
                  disabled={!st}
                  onClick={() => add(p)}
                >
                  <div className="prod-badge-row">
                    <CatTag category={p.category} />
                  </div>
                  <span className="name">{p.name}</span>
                  <span className="gen">{p.generic}</span>
                  <span className="row between" style={{ marginTop: "auto" }}>
                    <span className="price">{baht(p.price)}</span>
                    <Badge
                      cls={!st ? "danger" : st <= p.minStock ? "warn" : "muted"}
                    >
                      {st ? `${st} ${p.unit}` : "หมด"}
                    </Badge>
                  </span>
                </button>
              );
            })}
            {!found.length && <p className="muted">ไม่พบสินค้า</p>}
          </div>
        </section>

        <aside className="window cart">
          <div className="window-bar">
            <i />
            <i />
            <i />
            <span className="title">ตะกร้า · {lines.length} รายการ</span>
            <span className="spacer" />
            {lines.length > 0 && (
              <button
                className="btn ghost sm"
                onClick={() => {
                  setCart([]);
                  setRxNo("");
                  setPrescriber("");
                }}
              >
                ล้าง
              </button>
            )}
          </div>
          <div className="window-body">
            <MemberPicker customer={cust} onPick={setCustomerId} />
            {cust?.allergies && (
              <div className="alert danger" style={{ marginTop: 8 }}>
                ประวัติแพ้ยา: {cust.allergies}
              </div>
            )}

            <div className="cart-list" style={{ marginTop: 12 }}>
              {lines.map((l) => {
                const isControlled = l.p.category === "ยาควบคุมพิเศษ";
                if (isControlled) {
                  return (
                    <div className="cart-controlled-card" key={l.productId}>
<<<<<<< Updated upstream
=======
                      
                      <button
                        style={{
                          display: "flex",
                          justifySelf: "end",
                          alignItems: "end",
                          marginLeft: "auto",
                        }}
                        onClick={() => setQty(l.productId, 0)}
                        >
                        X
                      </button>
>>>>>>> Stashed changes
                      <div className="cart-line-main">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="nm">{l.p.name}</div>
                          <small className="muted">
                            {baht(l.p.price)} / {l.p.unit}
                          </small>
                          <div style={{ marginTop: 4 }}>
                            <CatTag category={l.p.category} />
                          </div>
                        </div>
                        <div className="qty">
                          <button
                            onClick={() => setQty(l.productId, l.qty - 1)}
                            aria-label="ลด"
                          >
                            −
                          </button>
                          <input
                            value={l.qty}
                            onChange={(e) => setQty(l.productId, e.target.value)}
                            aria-label="จำนวน"
                          />
                          <button onClick={() => add(l.p)} aria-label="เพิ่ม">
                            +
                          </button>
                        </div>
                        <b className="nowrap">{baht(l.p.price * l.qty)}</b>
                      </div>

                      <div className="cart-rx-section">
                        <div className="cart-rx-header">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-1px" }}>
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                          </svg>
                          <span>ข้อมูลใบสั่งยาแพทย์ (จำเป็นสำหรับยานี้)</span>
                        </div>
                        <div className="form-grid cart-rx-fields">
                          <Field label="เลขที่ใบสั่งยา *">
                            <input
                              placeholder="เช่น RX-2026-001"
                              value={rxNo}
                              onChange={(e) => setRxNo(e.target.value)}
                            />
                          </Field>
                          <Field label="ชื่อแพทย์ผู้สั่งยา *">
                            <input
                              placeholder="เช่น นพ.สมศักดิ์ รักดี"
                              value={prescriber}
                              onChange={(e) => setPrescriber(e.target.value)}
                            />
                          </Field>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="cart-line" key={l.productId}>
                    <div>
                      <div className="nm">{l.p.name}</div>
                      <small className="muted">
                        {baht(l.p.price)} / {l.p.unit}
                      </small>
                      {PHARMACIST_ONLY.includes(l.p.category) && (
                        <div style={{ marginTop: 4 }}>
                          <CatTag category={l.p.category} />
                        </div>
                      )}
                    </div>
                    <div className="qty">
                      <button
                        onClick={() => setQty(l.productId, l.qty - 1)}
                        aria-label="ลด"
                      >
                        −
                      </button>
                      <input
                        value={l.qty}
                        onChange={(e) => setQty(l.productId, e.target.value)}
                        aria-label="จำนวน"
                      />
                      <button onClick={() => add(l.p)} aria-label="เพิ่ม">
                        +
                      </button>
                    </div>
                    <b className="nowrap">{baht(l.p.price * l.qty)}</b>
                  </div>
                );
              })}
              {!lines.length && (
                <p className="empty">แตะสินค้าเพื่อเพิ่มลงตะกร้า</p>
              )}
            </div>

            <div className="pharmacist-readonly-box">
              <div className="fs-title" style={{ marginBottom: 8 }}>
                เภสัชกรผู้จ่ายยา {needPharm && "*"}
              </div>
              <div className="pharmacist-input-readonly">
                <span className="ph-lock-icon">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-1px" }}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={
                    me
                      ? `${me.title} ${me.name}${me.license?.no ? ` · ${me.license.no}` : " (ไม่มีใบประกอบวิชาชีพ)"}`
                      : "ไม่พบข้อมูลผู้ใช้"
                  }
                  className="input-readonly"
                  aria-label="เภสัชกรผู้จ่ายยา"
                />
              </div>
              {needPharm &&
                (!me?.license ||
                  licenseStatus(me.license).key === "expired") && (
                  <div className="alert danger small" style={{ marginTop: 8 }}>
                    บัญชีนี้ไม่มีใบประกอบวิชาชีพเภสัชกรรมที่ยังไม่หมดอายุ
                    ไม่สามารถจ่ายยาอันตราย/ควบคุมพิเศษได้
                  </div>
                )}
            </div>

            <div className="totals">
              <div className="row between">
                <span className="muted">รวม</span>
                <span>{baht(subtotal)}</span>
              </div>
              <div className="row between">
                <span className="muted">ส่วนลด (บาท)</span>
                <input
                  style={{
                    width: 110,
                    textAlign: "right",
                    padding: "6px 10px",
                  }}
                  inputMode="decimal"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="row between">
                <span>ยอดสุทธิ</span>
                <span className="grand">{baht(total)}</span>
              </div>
            </div>

            <div className="pay-opts">
              {[
                ["cash", "เงินสด"],
                ["qr", "พร้อมเพย์"],
                ["card", "บัตร"],
              ].map(([k, v]) => (
                <button
                  key={k}
                  className={payment === k ? "on" : ""}
                  onClick={() => setPayment(k)}
                >
                  {v}
                </button>
              ))}
            </div>
            {payment === "cash" && (
              <div style={{ marginTop: 12 }}>
                <Field label="รับเงิน">
                  <input
                    inputMode="decimal"
                    value={received}
                    onChange={(e) => setReceived(e.target.value)}
                    placeholder={total.toFixed(2)}
                  />
                </Field>
                <div className="row" style={{ marginTop: 8 }}>
                  <button
                    className="btn sm"
                    onClick={() => setReceived(String(total))}
                  >
                    พอดี
                  </button>
                  {quick.slice(0, 4).map((v) => (
                    <button
                      key={v}
                      className="btn sm"
                      onClick={() => setReceived(String(v))}
                    >
                      {v}
                    </button>
                  ))}
                  <span className="spacer" />
                  {received !== "" && (
                    <b
                      style={{
                        color: change < 0 ? "var(--danger)" : "var(--accent)",
                      }}
                    >
                      ทอน {baht(Math.max(change, 0))}
                    </b>
                  )}
                </div>
              </div>
            )}
            {payment === "qr" && (
              <div className="qr-box" style={{ marginTop: 12 }}>
                <div className="fake-qr" />
                <div>
                  พร้อมเพย์ {state.settings.promptPay}
                  <br />
                  <b>{baht(total)}</b>
                  <br />
                  <small className="muted">
                    QR ตัวอย่าง - ยังไม่เชื่อมผู้ให้บริการชำระเงิน
                  </small>
                </div>
              </div>
            )}

            <button
              className="btn primary lg full"
              style={{ marginTop: 16 }}
              disabled={busy || !lines.length}
              onClick={checkout}
            >
              {busy ? "กำลังบันทึก..." : `ชำระเงิน ${baht(total)}`}
            </button>
          </div>
        </aside>
      </div>

      {doneReceipt && (
        <Modal
          title={`ขายสำเร็จ · ${doneReceipt.no}`}
          onClose={() => setDone(null)}
          footer={
            <>
              <div className="seg left">
                <button
                  className={printMode === "receipt" ? "on" : ""}
                  onClick={() => setPrintMode("receipt")}
                >
                  ใบเสร็จ
                </button>
                <button
                  className={printMode === "label" ? "on" : ""}
                  onClick={() => setPrintMode("label")}
                >
                  ฉลากยา
                </button>
              </div>
              <button className="btn" onClick={() => setDone(null)}>
                ปิด
              </button>
              <PrintButtons
                build={() =>
                  printMode === "receipt"
                    ? receiptDoc(doneReceipt, state)
                    : labelsDoc(doneReceipt, state)
                }
                filename={`${printMode === "receipt" ? "receipt" : "label"}-${doneReceipt.no}.pdf`}
              />
            </>
          }
        >
          {printMode === "receipt" ? (
            <ReceiptView receipt={doneReceipt} />
          ) : (
            doneReceipt.items.map((it, i) => (
              <DrugLabel key={i} item={it} receipt={doneReceipt} />
            ))
          )}
        </Modal>
      )}
    </div>
  );
}
