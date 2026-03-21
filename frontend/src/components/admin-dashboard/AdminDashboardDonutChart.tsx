type DonutSegment = {
  label: string;
  value: number;
  color: string;
};

type AdminDashboardDonutChartProps = {
  title: string;
  subtitle: string;
  segments: DonutSegment[];
  centerLabel: string;
  centerValue: string;
};

export default function AdminDashboardDonutChart({
  title,
  subtitle,
  segments,
  centerLabel,
  centerValue,
}: AdminDashboardDonutChartProps) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const normalizedSegments = segments.map((segment) => ({
    ...segment,
    value: Number(segment.value) || 0,
  }));
  const total = normalizedSegments.reduce((sum, segment) => sum + segment.value, 0) || 1;
  const drawableSegments = normalizedSegments
    .filter((segment) => segment.value > 0)
    .map((segment) => ({
      ...segment,
      rawLength: (segment.value / total) * circumference,
    }));
  const maxSafeMinLength = drawableSegments.length > 0 ? circumference / drawableSegments.length : 0;
  const minVisibleLength =
    drawableSegments.length > 1 ? Math.min(20, maxSafeMinLength * 0.7) : 0;
  const segmentGap = drawableSegments.length > 1 ? 4 : 0;
  const boostedLengthTotal = drawableSegments
    .filter((segment) => segment.rawLength < minVisibleLength)
    .reduce((sum) => sum + minVisibleLength, 0);
  const remainingRawLength = drawableSegments
    .filter((segment) => segment.rawLength >= minVisibleLength)
    .reduce((sum, segment) => sum + segment.rawLength, 0);
  const remainingDrawableLength = Math.max(circumference - boostedLengthTotal, 0);
  const chartSegments = drawableSegments.map((segment) => {
    if (segment.rawLength < minVisibleLength) {
      return {
        ...segment,
        chartLength: minVisibleLength,
      };
    }

    if (remainingRawLength <= 0) {
      return {
        ...segment,
        chartLength: segment.rawLength,
      };
    }

    return {
      ...segment,
      chartLength: (segment.rawLength / remainingRawLength) * remainingDrawableLength,
    };
  });
  const chartSegmentsWithOffset = chartSegments.reduce<
    Array<(typeof chartSegments)[number] & { offset: number; segmentLength: number }>
  >((acc, segment) => {
    const last = acc[acc.length - 1];
    const previousOffset = last ? last.offset + last.segmentLength : 0;
    const segmentLength = Math.max(segment.chartLength - segmentGap, 0);
    acc.push({
      ...segment,
      offset: previousOffset,
      segmentLength,
    });
    return acc;
  }, []);

  return (
    <article className="admin-dashboard-panel admin-dashboard-panel--donut">
      <div className="admin-dashboard-panel__head">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="admin-donut">
        <div className="admin-donut__chart">
          <svg viewBox="0 0 160 160" aria-hidden="true">
            <circle cx="80" cy="80" r={radius} className="admin-donut__track" />
            {chartSegmentsWithOffset.map((segment) => {
              const circle = (
                <circle
                  key={segment.label}
                  cx="80"
                  cy="80"
                  r={radius}
                  className="admin-donut__segment"
                  style={{ stroke: segment.color }}
                  strokeDasharray={`${segment.segmentLength} ${circumference - segment.segmentLength}`}
                  strokeDashoffset={segment.offset}
                />
              );
              return circle;
            })}
          </svg>
          <div className="admin-donut__center">
            <strong>{centerValue}</strong>
            <span>{centerLabel}</span>
          </div>
        </div>

        <div className="admin-donut__legend">
          {normalizedSegments.map((segment) => (
            <div className="admin-donut__legend-item" key={segment.label}>
              <span className="admin-donut__swatch" style={{ background: segment.color }} />
              <div>
                <strong>{segment.value}</strong>
                <span>{segment.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
