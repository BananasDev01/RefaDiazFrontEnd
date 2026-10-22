import {
  Document,
  Circle,
  Font,
  Image,
  Page,
  Path,
  Polygon,
  StyleSheet,
  Svg,
  Text,
  View,
} from '@react-pdf/renderer';
import type { ReactNode } from 'react';
import {
  siAudi,
  siBmw,
  siChevrolet,
  siChrysler,
  siFord,
  siHonda,
  siHyundai,
  siKia,
  siNissan,
  siRenault,
  siToyota,
  siVolkswagen,
  type SimpleIcon,
} from 'simple-icons';
import { COMPRESSION_WARNING } from '../serviceOrderText';
import type { ServiceOrderPdfData, ServiceOrderPdfFailure } from './serviceOrderPdfData';
import { parseImportantNote } from '../importantNoteFormat';

Font.registerHyphenationCallback((word) => [word]);

const RED = '#cf2633';
const INK = '#202124';
const MUTED = '#60646c';
const LINE = '#3e4147';
const PAPER = '#ffffff';
const SOFT = '#f4f4f2';

const styles = StyleSheet.create({
  page: {
    padding: 18,
    backgroundColor: PAPER,
    color: INK,
    fontFamily: 'Helvetica',
    fontSize: 7,
  },
  frame: {
    minHeight: 735,
    borderWidth: 1.25,
    borderColor: LINE,
    borderRadius: 10,
    padding: 9,
  },
  header: {
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingBottom: 5,
  },
  logoColumn: { width: '34%', paddingRight: 8, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 170, height: 58, objectFit: 'contain' },
  headerCenter: { width: '43%', alignItems: 'center', paddingHorizontal: 3 },
  slogan: { fontFamily: 'Helvetica-Bold', fontSize: 6.4, textAlign: 'center', lineHeight: 1.22 },
  specialists: { fontSize: 5.7, letterSpacing: 1.6, marginTop: 4 },
  brandLogos: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 },
  brandLogo: { width: 20, height: 17 },
  fordLogo: { width: 40, height: 15 },
  chryslerLogo: { width: 60, height: 9.6 },
  mercedesLogo: { width: 18, height: 17 },
  folioColumn: { width: '23%', alignItems: 'flex-end' },
  documentType: { fontSize: 5.5, letterSpacing: 0.9, color: MUTED },
  dateLabel: { fontSize: 5, color: MUTED, marginTop: 5 },
  dateValue: { fontFamily: 'Helvetica-Bold', fontSize: 8, marginTop: 1 },
  folio: { fontFamily: 'Helvetica-Bold', fontSize: 13, color: RED, marginTop: 4 },
  title: {
    height: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 0.8,
    borderBottomColor: LINE,
  },
  titleText: { fontFamily: 'Helvetica-Bold', fontSize: 9.5, letterSpacing: 0.65 },
  fieldRow: { flexDirection: 'row', minHeight: 18, alignItems: 'flex-end' },
  inlineField: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 3, paddingVertical: 3 },
  inlineLabel: { fontFamily: 'Helvetica-Bold', fontSize: 5.7, marginRight: 4, paddingBottom: 1.5 },
  inlineValue: { flexGrow: 1, flexShrink: 1, minWidth: 0, borderBottomWidth: 0.6, borderBottomColor: LINE, minHeight: 11, fontSize: 7.3, paddingHorizontal: 2, paddingBottom: 1 },
  reception: { minHeight: 59, borderBottomWidth: 0.8, borderBottomColor: LINE, paddingVertical: 2 },
  diagnostic: { borderBottomWidth: 0.8, borderBottomColor: LINE },
  diagnosticHeaderRow: { height: 26, flexDirection: 'row' },
  columnHeader: { height: 26, paddingHorizontal: 4, justifyContent: 'center', alignItems: 'center', backgroundColor: SOFT, borderBottomWidth: 0.8, borderBottomColor: LINE, borderRightWidth: 0.8, borderRightColor: LINE },
  columnHeaderLast: { height: 26, paddingHorizontal: 4, justifyContent: 'center', alignItems: 'center', backgroundColor: SOFT, borderBottomWidth: 0.8, borderBottomColor: LINE },
  columnHeaderText: { fontFamily: 'Helvetica-Bold', fontSize: 6.2, textAlign: 'center', lineHeight: 1.15 },
  diagnosticRows: {},
  diagnosticRow: { flexDirection: 'row', minHeight: 19 },
  failureCell: { width: '31%', flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 5, paddingVertical: 3, borderRightWidth: 0.8, borderRightColor: LINE, borderBottomWidth: 0.4, borderBottomColor: '#b6b8bc' },
  observationCell: { width: '55%', paddingHorizontal: 5, paddingVertical: 3, borderRightWidth: 0.8, borderRightColor: LINE, borderBottomWidth: 0.4, borderBottomColor: '#b6b8bc' },
  amountCell: { width: '14%', justifyContent: 'flex-end', flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 5, paddingVertical: 3, borderBottomWidth: 0.4, borderBottomColor: '#b6b8bc' },
  checkbox: { width: 7, height: 7, borderWidth: 0.7, borderColor: LINE, marginRight: 4, marginTop: 0.3, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { borderColor: RED, backgroundColor: RED },
  checkboxMark: { fontFamily: 'Helvetica-Bold', fontSize: 5.5, color: PAPER },
  failureText: { flexGrow: 1, flexShrink: 1, minWidth: 0, fontSize: 6.25, lineHeight: 1.18 },
  lineAmount: { width: '100%', fontFamily: 'Helvetica-Bold', fontSize: 6.25, textAlign: 'right' },
  observationText: { fontSize: 6.25, lineHeight: 1.18 },
  bodyText: { fontSize: 7.1, lineHeight: 1.35 },
  technicalWarnings: { minHeight: 43, flexDirection: 'row', borderTopWidth: 0.7, borderTopColor: RED },
  warningCell: { width: '100%', paddingHorizontal: 5, paddingVertical: 4, borderRightWidth: 0.8, borderRightColor: LINE },
  warningRow: { flexDirection: 'row', marginVertical: 4 },
  warningText: { width: '95%', color: RED, fontFamily: 'Helvetica-Bold', fontWeight: 700, fontSize: 6.5, lineHeight: 1.25 },
  infoSection: { borderBottomWidth: 0.8, borderBottomColor: LINE },
  infoBody: { flexDirection: 'row', minHeight: 84 },
  infoLeft: { width: '29%', borderRightWidth: 0.8, borderRightColor: LINE, padding: 5 },
  infoRight: { width: '71%', padding: 7 },
  redHeading: { fontFamily: 'Helvetica-Bold', fontSize: 7, color: RED, letterSpacing: 0.55, marginBottom: 4 },
  obstruction: { marginTop: 23, paddingTop: 4 },
  obstructionLabel: { fontFamily: 'Helvetica-Bold', fontSize: 6 },
  obstructionScale: { flexDirection: 'row', marginTop: 4 },
  scaleCell: { width: 12, height: 13, borderWidth: 0.5, borderColor: LINE, alignItems: 'center', justifyContent: 'center', marginRight: -0.5 },
  scaleCellSelected: { backgroundColor: RED, borderColor: RED },
  scaleText: { fontSize: 5.5 },
  scaleTextSelected: { color: PAPER, fontFamily: 'Helvetica-Bold' },
  amountRow: { height: 38, flexDirection: 'row', borderTopWidth: 0.8, borderTopColor: LINE },
  amountBox: { flexGrow: 1, padding: 5, borderRightWidth: 0.8, borderRightColor: LINE, justifyContent: 'center' },
  amountBoxLast: { flexGrow: 1, padding: 5, justifyContent: 'center', backgroundColor: SOFT },
  amountLabel: { fontFamily: 'Helvetica-Bold', fontSize: 5.8, color: MUTED },
  amountValue: { fontFamily: 'Helvetica-Bold', fontSize: 9, marginTop: 2 },
  signatureArea: { minHeight: 65, paddingTop: 6 },
  signatureRow: { height: 42, flexDirection: 'row', alignItems: 'flex-end' },
  signature: { width: '36%', paddingHorizontal: 12, alignItems: 'center' },
  signatureValue: { height: 20, justifyContent: 'flex-end', textAlign: 'center', fontSize: 6.5 },
  signatureLine: { width: '100%', borderTopWidth: 0.7, borderTopColor: LINE, paddingTop: 3, textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 5.5 },
  warranty: { width: '28%', borderWidth: 0.8, borderColor: RED, padding: 4, alignItems: 'center', alignSelf: 'center' },
  warrantyTitle: { fontFamily: 'Helvetica-Bold', color: RED, fontSize: 6, textAlign: 'center' },
  warrantyValue: { fontFamily: 'Helvetica-Bold', fontSize: 10, marginTop: 3 },
  legal: { fontFamily: 'Helvetica-Bold', fontSize: 4.8, lineHeight: 1.18, textAlign: 'center', paddingHorizontal: 7, marginTop: 4 },
  receipt: { paddingHorizontal: 4, paddingBottom: 4 },
  receiptHeader: { height: 23, flexDirection: 'row', alignItems: 'center' },
  receiptBrand: { width: '25%', fontFamily: 'Helvetica-Bold', fontSize: 8.5 },
  receiptTitle: { width: '50%', fontFamily: 'Helvetica-Bold', fontSize: 7.5, textAlign: 'center', letterSpacing: 0.45 },
  receiptFolio: { width: '25%', fontFamily: 'Helvetica-Bold', fontSize: 9, color: RED, textAlign: 'right' },
  receiptFields: { flexGrow: 1, paddingTop: 2 },
  footer: { marginTop: 'auto', borderTopWidth: 0.7, borderTopColor: LINE, paddingTop: 3, textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 5.3 },
  pageNumber: { position: 'absolute', bottom: 6, left: 18, right: 18, textAlign: 'right', fontSize: 5.5, color: MUTED },
});

const money = (value: number) => new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
}).format(value);

const InlineField = ({ label, value, width, lines = 1 }: { label: string; value: string; width: string; lines?: number }) => (
  <View style={[styles.inlineField, { width }]}>
    <Text style={styles.inlineLabel}>{label}</Text>
    <Text style={[styles.inlineValue, { minHeight: lines * 11, lineHeight: 1.4 }]}>{value || ' '}</Text>
  </View>
);

const Check = ({ checked }: { checked: boolean }) => (
  <View style={[styles.checkbox, checked ? styles.checkboxSelected : {}]}>
    {checked && <Text style={styles.checkboxMark}>X</Text>}
  </View>
);

const FailureRow = ({ failure }: { failure: ServiceOrderPdfFailure }) => (
  <View style={[styles.diagnosticRow, failure.selected ? {} : { minHeight: 15 }]} wrap={false}>
    <View style={styles.failureCell}>
      <Check checked={failure.selected} />
      <Text style={styles.failureText}>
        {failure.label.toUpperCase()}{failure.detail ? `: ${failure.detail}` : ''}
      </Text>
    </View>
    <View style={styles.observationCell}>
      <Text style={styles.observationText}>{failure.selected ? failure.observation || ' ' : ' '}</Text>
    </View>
    <View style={styles.amountCell}>
      {failure.selected && failure.amount !== null && (
        <Text style={styles.lineAmount}>{money(failure.amount)}</Text>
      )}
    </View>
  </View>
);

const Warning = ({ checked, children }: { checked: boolean; children: ReactNode }) => (
  <View style={styles.warningRow}>
    <Check checked={checked} />
    <Text style={styles.warningText}>{children}</Text>
  </View>
);

const BrandIcon = ({ icon, style = styles.brandLogo, viewBox = '0 0 24 24' }: { icon: SimpleIcon; style?: typeof styles.brandLogo; viewBox?: string }) => (
  <Svg viewBox={viewBox} style={style}>
    <Path d={icon.path} fill={INK} />
  </Svg>
);

const brandIconsSecondRow = [siKia, siHyundai, siRenault, siBmw, siAudi];

const MercedesLogo = () => (
  <Svg viewBox="0 0 24 24" style={styles.mercedesLogo}>
    <Circle cx="12" cy="12" r="10.25" fill="none" stroke={INK} strokeWidth="1.4" />
    <Polygon points="12,2.1 13.15,11.2 12,12.2 10.85,11.2" fill={INK} />
    <Polygon points="21.1,17.6 12.65,13.15 12,12.2 13.3,12.55" fill={INK} />
    <Polygon points="2.9,17.6 10.7,12.55 12,12.2 11.35,13.15" fill={INK} />
  </Svg>
);

const BrandLogoRow = () => (
  <>
    <View style={styles.brandLogos}>
      {/* Ford and Chrysler are wide wordmarks: crop the square icon box to the drawing so they read at the same weight. */}
      <BrandIcon icon={siFord} style={styles.fordLogo} viewBox="0 7.5 24 9" />
      <BrandIcon icon={siNissan} />
      <BrandIcon icon={siChrysler} style={styles.chryslerLogo} viewBox="0 10.05 24 3.9" />
      <BrandIcon icon={siChevrolet} />
      <BrandIcon icon={siToyota} />
      <BrandIcon icon={siHonda} />
      <BrandIcon icon={siVolkswagen} />
    </View>
    <View style={[styles.brandLogos, { paddingHorizontal: 10 }]}>
      {brandIconsSecondRow.map((icon) => <BrandIcon key={icon.slug} icon={icon} />)}
      <MercedesLogo />
    </View>
  </>
);

export type ServiceOrderPdfKind = 'order' | 'receipt';

export interface ServiceOrderPdfDocumentProps {
  data: ServiceOrderPdfData;
  logoSource: string;
  kind?: ServiceOrderPdfKind;
}

export const ServiceOrderPdfDocument = ({ data, logoSource, kind = 'order' }: ServiceOrderPdfDocumentProps) => {
  const warrantyLabel = data.warrantyMonths === null
    ? 'SIN ESPECIFICAR'
    : data.warrantyMonths === 0
      ? 'SIN GARANTIA'
      : `${data.warrantyMonths} MESES`;
  const vehicleName = [data.brand, data.model, data.modelYear].filter(Boolean).join(' ');

  return (
    <Document
      title={`${kind === 'receipt' ? 'Comprobante' : 'Orden de servicio'} ${data.folio}`}
      author="Radiadores Diaz"
      subject="Cotizacion de trabajo o refacciones"
      creator="RefaDiaz System"
    >
      <Page size="LETTER" orientation="portrait" style={[styles.page, kind === 'order' ? { paddingTop: 36, paddingBottom: 30 } : {}]}>
        {kind === 'order' && <View fixed style={{ position: 'absolute', top: 18, bottom: 30, left: 18, right: 18, borderWidth: 1.25, borderColor: LINE, borderRadius: 10 }} />}
        {kind === 'order' && <Text fixed style={{ position: 'absolute', top: 24, left: 28, right: 28, fontSize: 6, color: MUTED }} render={({ pageNumber }) => pageNumber > 1 ? `ORDEN ${data.folio} - CONTINUACIÓN` : ''} />}
        {/* Keep the decorative border outside flowing content: a split min-height
            frame can otherwise generate an empty trailing page. */}
        <View style={kind === 'receipt' ? [styles.frame, { minHeight: 0 }] : { paddingHorizontal: 10.25 }}>
          {kind === 'order' && <>
          <View style={styles.header} wrap={false}>
            <View style={styles.logoColumn}>
              <Image src={logoSource} style={styles.logo} />
            </View>
            <View style={styles.headerCenter}>
              <Text style={styles.slogan}>PARA REPARACIONES CUALQUIERA ES BUENO{`\n`}PARA PROBLEMAS DE CALENTAMIENTO{`\n`}SOLO RADIADORES DÍAZ</Text>
              <Text style={styles.specialists}>ESPECIALISTAS EN:</Text>
              <BrandLogoRow />
            </View>
            <View style={styles.folioColumn}>
              <Text style={styles.documentType}>ORDEN DE SERVICIO</Text>
              <Text style={styles.dateLabel}>FECHA</Text>
              <Text style={styles.dateValue}>{data.serviceDate || '___/___/______'}</Text>
              <Text style={styles.folio}>N° {data.folio}</Text>
            </View>
          </View>

          <View style={styles.title}>
            <Text style={styles.titleText}>COTIZACIÓN DE TRABAJO O REFACCIONES</Text>
          </View>

          <View style={styles.reception} wrap={false}>
            <View style={styles.fieldRow}>
              <InlineField label="CLIENTE" value={data.clientName} width="60%" />
              <InlineField label="TEL." value={data.phoneNumber} width="40%" />
            </View>
            <View style={{ ...styles.fieldRow, minHeight: 30 }}>
              <InlineField label="FALLA" value={data.reportedFailureSummary} width="100%" lines={2} />
            </View>
            <View style={styles.fieldRow}>
              <InlineField label="MARCA" value={data.brand} width="22%" />
              <InlineField label="MODELO / AÑO" value={[data.model, data.modelYear].filter(Boolean).join(' ')} width="28%" />
              <InlineField label="COLOR" value={data.color} width="20%" />
              <InlineField label="PLACAS" value={data.plate} width="30%" />
            </View>
          </View>

          <View style={styles.diagnostic}>
            <View style={styles.diagnosticHeaderRow}>
              <View style={[styles.columnHeader, { width: '31%' }]}>
                <Text style={styles.columnHeaderText}>FALLAS REPORTADAS</Text>
              </View>
              <View style={[styles.columnHeader, { width: '55%' }]}>
                <Text style={styles.columnHeaderText}>OBSERVACIONES DEL FUNCIONAMIENTO O{`\n`}FALLAS DEL AUTOMÓVIL</Text>
              </View>
              <View style={[styles.columnHeaderLast, { width: '14%' }]}>
                <Text style={styles.columnHeaderText}>COSTO</Text>
              </View>
            </View>
            <View style={styles.diagnosticRows}>
              {data.failures.map((failure, index) => <FailureRow key={`${failure.label}-${index}`} failure={failure} />)}
              <View style={styles.technicalWarnings} wrap={false}>
                <View style={styles.warningCell}>
                  <Warning checked={data.compressionLeakDetected}>{COMPRESSION_WARNING.toLocaleUpperCase('es-MX')}</Warning>
                  <Warning checked={data.coolingSystemAirPressureDetected}>{data.informationalNote.toLocaleUpperCase('es-MX')}</Warning>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.infoSection}>
            <View style={styles.infoBody}>
              <View style={styles.infoLeft}>
                <InlineField label="SERIE" value={data.radiatorSerialNumber} width="100%" />
                <View style={styles.obstruction}>
                  <Text style={styles.obstructionLabel}>RADIADOR TAPADO</Text>
                  <View style={styles.obstructionScale}>
                    {Array.from({ length: 11 }, (_, level) => {
                      const selected = data.radiatorObstructionLevel === level;
                      return (
                        <View key={level} style={[styles.scaleCell, selected ? styles.scaleCellSelected : {}]}>
                          <Text style={[styles.scaleText, selected ? styles.scaleTextSelected : {}]}>{level}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
              <View style={styles.infoRight}>
                <Text style={styles.redHeading}>INFORMACIÓN IMPORTANTE / OBSERVACIONES</Text>
                {parseImportantNote(data.importantInformation || ' ').map((line, index) => <Text key={index} style={styles.bodyText}>{line.length ? line.map((part, i) => <Text key={i} style={{ textDecoration: part.underline ? 'underline' : 'none', backgroundColor: part.highlight ? '#fff19b' : PAPER }}>{part.text}</Text>) : ' '}</Text>)}
              </View>
            </View>
          </View>
          {/* Keep the financial closing and the signatures on the same page. */}
          <View wrap={false}>
            <View style={styles.amountRow} wrap={false}>
              <View style={styles.amountBox}>
                <Text style={styles.amountLabel}>COSTO DEL TRABAJO</Text>
                <Text style={styles.amountValue}>{money(data.subtotal)}</Text>
              </View>
              <View style={styles.amountBox}>
                <Text style={styles.amountLabel}>I.V.A.</Text>
                <Text style={styles.amountValue}>{money(data.taxAmount)}</Text>
              </View>
              <View style={styles.amountBoxLast}>
                <Text style={styles.amountLabel}>TOTAL</Text>
                <Text style={styles.amountValue}>{money(data.total)}</Text>
              </View>
            </View>
          <View style={styles.signatureArea} wrap={false}>
            <View style={styles.signatureRow}>
              <View style={styles.signature}>
                <Text style={styles.signatureValue}>{data.workManagerName || ' '}</Text>
                <Text style={styles.signatureLine}>ENCARGADO DE TRABAJO</Text>
              </View>
              <View style={styles.signature}>
                <Text style={styles.signatureValue}> </Text>
                <Text style={styles.signatureLine}>FIRMA DE CONFORMIDAD DEL CLIENTE</Text>
              </View>
              <View style={styles.warranty}>
                <Text style={styles.warrantyTitle}>GARANTÍA EN PIEZAS CAMBIADAS</Text>
                <Text style={styles.warrantyValue}>{warrantyLabel}</Text>
              </View>
            </View>
            <Text style={styles.legal}>{data.warrantyLegalText.toUpperCase()}</Text>
            <Text style={[styles.footer, { marginTop: 4 }]}>JOSE ALVARADO 2008 LOCS. 29 Y 30 COL. LA ESPAÑOLA · TELS. 81 8359-6091 / 81 8387-1040 · MONTERREY, N.L.</Text>
          </View>
          </View>

          </>}
          {kind === 'receipt' && <>

          <View style={styles.receipt}>
            <View style={styles.receiptHeader}>
              <Text style={styles.receiptBrand}>RADIADORES DÍAZ</Text>
              <Text style={styles.receiptTitle}>COMPROBANTE DE RECEPCIÓN</Text>
              <Text style={styles.receiptFolio}>N° {data.folio}</Text>
            </View>
            <View style={styles.receiptFields}>
              <View style={styles.fieldRow}>
                <InlineField label="CLIENTE" value={data.clientName} width="48%" />
                <InlineField label="TEL." value={data.phoneNumber} width="27%" />
                <InlineField label="FECHA" value={data.serviceDate} width="25%" />
              </View>
              <View style={styles.fieldRow}>
                <InlineField label="VEHÍCULO" value={vehicleName} width="48%" />
                <InlineField label="COLOR" value={data.color} width="22%" />
                <InlineField label="PLACAS" value={data.plate} width="30%" />
              </View>
            </View>
          </View>

          </>}
          {kind === 'receipt' && <Text style={styles.footer}>JOSE ALVARADO 2008 LOCS. 29 Y 30 COL. LA ESPAÑOLA · TELS. 81 8359-6091 / 81 8387-1040 · MONTERREY, N.L.</Text>}
        </View>
        {kind === 'receipt' && <View style={{ marginTop: 8, borderTopWidth: 0.5, borderTopColor: MUTED, borderTopStyle: 'dashed' }} />}
        {kind === 'order' && <Text fixed style={styles.pageNumber} render={({ pageNumber, totalPages }) => `Orden ${data.folio} · ${pageNumber} / ${totalPages}`} />}
      </Page>
    </Document>
  );
};
