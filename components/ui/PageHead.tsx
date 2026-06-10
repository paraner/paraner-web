// Panel sayfa başlığı: başlık + alt yazı + (opsiyonel) sağda aksiyon butonu.
export default function PageHead({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="panel-page-head">
      <div>
        <h1 className="panel-h1">{title}</h1>
        {sub && (
          <p className="panel-sub" style={{ marginBottom: 0 }}>
            {sub}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
