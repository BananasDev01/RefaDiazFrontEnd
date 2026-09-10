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
  siBmw,
  siChevrolet,
  siChrysler,
  siFord,
  siHonda,
  siNissan,
  siRenault,
  siVolkswagen,
} from 'simple-icons';
import type { ServiceOrderPdfData, ServiceOrderPdfFailure } from './serviceOrderPdfData';

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
    height: '100%',
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
  logo: { width: 112, height: 34, objectFit: 'contain' },
  contactBox: { width: 160, backgroundColor: INK, marginTop: 1.5, paddingHorizontal: 4, paddingVertical: 2.5 },
  contactPrimary: { color: PAPER, fontFamily: 'Helvetica-Bold', fontSize: 4.4, textAlign: 'center', lineHeight: 1.15 },
  contactSecondary: { color: PAPER, fontSize: 4, textAlign: 'center', lineHeight: 1.15 },
  headerCenter: { width: '43%', alignItems: 'center', paddingHorizontal: 3 },
  slogan: { fontFamily: 'Helvetica-Bold', fontSize: 6.4, textAlign: 'center', lineHeight: 1.22 },
  specialists: { fontSize: 5.7, letterSpacing: 1.6, marginTop: 4 },
  brandLogos: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  brandLogo: { width: 19, height: 13 },
  chryslerLogo: { width: 35, height: 20 },
  mercedesLogo: { width: 17, height: 13 },
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
  inlineValue: { flexGrow: 1, borderBottomWidth: 0.6, borderBottomColor: LINE, minHeight: 11, fontSize: 7.3, paddingHorizontal: 2, paddingBottom: 1 },
  reception: { height: 59, borderBottomWidth: 0.8, borderBottomColor: LINE, paddingVertical: 2 },
  diagnostic: { height: 265, borderBottomWidth: 0.8, borderBottomColor: LINE },
  diagnosticHeaderRow: { height: 26, flexDirection: 'row' },
  columnHeader: { height: 26, paddingHorizontal: 4, justifyContent: 'center', alignItems: 'center', backgroundColor: SOFT, borderBottomWidth: 0.8, borderBottomColor: LINE, borderRightWidth: 0.8, borderRightColor: LINE },
  columnHeaderLast: { height: 26, paddingHorizontal: 4, justifyContent: 'center', alignItems: 'center', backgroundColor: SOFT, borderBottomWidth: 0.8, borderBottomColor: LINE },
  columnHeaderText: { fontFamily: 'Helvetica-Bold', fontSize: 6.2, textAlign: 'center', lineHeight: 1.15 },
  diagnosticRows: { flexGrow: 1, overflow: 'hidden' },
  diagnosticRow: { flexDirection: 'row', minHeight: 14 },
  failureCell: { width: '31%', flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 5, paddingVertical: 3, borderRightWidth: 0.8, borderRightColor: LINE, borderBottomWidth: 0.4, borderBottomColor: '#b6b8bc' },
  conceptCell: { width: '29%', flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 5, paddingVertical: 3, borderRightWidth: 0.8, borderRightColor: LINE, borderBottomWidth: 0.4, borderBottomColor: '#b6b8bc' },
  observationCell: { width: '40%', paddingHorizontal: 5, paddingVertical: 3, borderBottomWidth: 0.4, borderBottomColor: '#b6b8bc' },
  checkbox: { width: 7, height: 7, borderWidth: 0.7, borderColor: LINE, marginRight: 4, marginTop: 0.3, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { borderColor: RED, backgroundColor: RED },
  checkboxMark: { fontFamily: 'Helvetica-Bold', fontSize: 5.5, color: PAPER },
  failureText: { flexGrow: 1, fontSize: 6.25, lineHeight: 1.18 },
  conceptText: { flexGrow: 1, fontSize: 6.25, lineHeight: 1.18, paddingRight: 3 },
  conceptAmount: { width: 45, fontFamily: 'Helvetica-Bold', fontSize: 6.25, textAlign: 'right' },
  observationText: { fontSize: 6.25, lineHeight: 1.18 },
  bodyText: { fontSize: 7.1, lineHeight: 1.35 },
  technicalWarnings: { marginTop: 'auto', minHeight: 43, flexDirection: 'row', borderTopWidth: 0.7, borderTopColor: RED },
  warningCell: { width: '31%', paddingHorizontal: 5, paddingVertical: 4, borderRightWidth: 0.8, borderRightColor: LINE },
  warningBlankMiddle: { width: '29%', borderRightWidth: 0.8, borderRightColor: LINE },
  warningBlankLast: { width: '40%' },
  warningRow: { flexDirection: 'row', marginBottom: 3 },
  warningText: { flexGrow: 1, color: RED, fontFamily: 'Helvetica-Bold', fontSize: 5.6, lineHeight: 1.15 },
  infoSection: { height: 126, borderBottomWidth: 0.8, borderBottomColor: LINE },
  infoBody: { flexDirection: 'row', height: 88 },
  infoLeft: { width: '42%', borderRightWidth: 0.8, borderRightColor: LINE, padding: 5 },
  infoRight: { width: '58%', padding: 5 },
  redHeading: { fontFamily: 'Helvetica-Bold', fontSize: 7, color: RED, letterSpacing: 0.55, marginBottom: 4 },
  obstruction: { marginTop: 5, borderTopWidth: 0.5, borderTopColor: LINE, paddingTop: 4 },
  obstructionLabel: { fontFamily: 'Helvetica-Bold', fontSize: 6 },
  obstructionScale: { flexDirection: 'row', marginTop: 4 },
  scaleCell: { width: 14, height: 13, borderWidth: 0.5, borderColor: LINE, alignItems: 'center', justifyContent: 'center', marginRight: -0.5 },
  scaleCellSelected: { backgroundColor: RED, borderColor: RED },
  scaleText: { fontSize: 5.5 },
  scaleTextSelected: { color: PAPER, fontFamily: 'Helvetica-Bold' },
  noteText: { fontSize: 6.4, lineHeight: 1.25 },
  amountRow: { height: 38, flexDirection: 'row', borderTopWidth: 0.8, borderTopColor: LINE },
  amountBox: { flexGrow: 1, padding: 5, borderRightWidth: 0.8, borderRightColor: LINE, justifyContent: 'center' },
  amountBoxLast: { flexGrow: 1, padding: 5, justifyContent: 'center', backgroundColor: SOFT },
  amountLabel: { fontFamily: 'Helvetica-Bold', fontSize: 5.8, color: MUTED },
  amountValue: { fontFamily: 'Helvetica-Bold', fontSize: 9, marginTop: 2 },
  signatureArea: { height: 79, paddingTop: 6 },
  signatureRow: { height: 42, flexDirection: 'row', alignItems: 'flex-end' },
  signature: { width: '36%', paddingHorizontal: 12, alignItems: 'center' },
  signatureValue: { height: 20, justifyContent: 'flex-end', textAlign: 'center', fontSize: 6.5 },
  signatureLine: { width: '100%', borderTopWidth: 0.7, borderTopColor: LINE, paddingTop: 3, textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 5.5 },
  warranty: { width: '28%', borderWidth: 0.8, borderColor: RED, padding: 4, alignItems: 'center', alignSelf: 'center' },
  warrantyTitle: { fontFamily: 'Helvetica-Bold', color: RED, fontSize: 6, textAlign: 'center' },
  warrantyValue: { fontFamily: 'Helvetica-Bold', fontSize: 10, marginTop: 3 },
  legal: { fontFamily: 'Helvetica-Bold', fontSize: 4.8, lineHeight: 1.18, textAlign: 'center', paddingHorizontal: 7, marginTop: 4 },
  cutLine: { height: 14, borderTopWidth: 0.8, borderTopColor: MUTED, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  cutLabel: { backgroundColor: PAPER, paddingHorizontal: 5, color: MUTED, fontSize: 5, letterSpacing: 0.5 },
  receipt: { height: 78, paddingHorizontal: 4 },
  receiptHeader: { height: 23, flexDirection: 'row', alignItems: 'center' },
  receiptBrand: { width: '25%', fontFamily: 'Helvetica-Bold', fontSize: 8.5 },
  receiptTitle: { width: '50%', fontFamily: 'Helvetica-Bold', fontSize: 7.5, textAlign: 'center', letterSpacing: 0.45 },
  receiptFolio: { width: '25%', fontFamily: 'Helvetica-Bold', fontSize: 9, color: RED, textAlign: 'right' },
  receiptFields: { flexGrow: 1, paddingTop: 2 },
  footer: { marginTop: 'auto', borderTopWidth: 0.7, borderTopColor: LINE, paddingTop: 3, textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 5.3 },
});

const money = (value: number) => new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
}).format(value);

const InlineField = ({ label, value, width }: { label: string; value: string; width: string }) => (
  <View style={[styles.inlineField, { width }]}>
    <Text style={styles.inlineLabel}>{label}</Text>
    <Text style={styles.inlineValue}>{value || ' '}</Text>
  </View>
);

const Check = ({ checked }: { checked: boolean }) => (
  <View style={[styles.checkbox, checked ? styles.checkboxSelected : {}]}>
    {checked && <Text style={styles.checkboxMark}>X</Text>}
  </View>
);

const FailureRow = ({ failure }: { failure: ServiceOrderPdfFailure }) => (
  <View style={styles.diagnosticRow}>
    <View style={styles.failureCell}>
      <Check checked={failure.selected} />
      <Text style={styles.failureText}>
        {failure.label.toUpperCase()}{failure.detail ? `: ${failure.detail}` : ''}
      </Text>
    </View>
    <View style={styles.conceptCell}>
      {failure.selected && (
        <>
          <Text style={styles.conceptText}>{failure.conceptName || ' '}</Text>
          {failure.amount !== null && <Text style={styles.conceptAmount}>{money(failure.amount)}</Text>}
        </>
      )}
    </View>
    <View style={styles.observationCell}>
      <Text style={styles.observationText}>{failure.selected ? failure.observation || ' ' : ' '}</Text>
    </View>
  </View>
);

const Warning = ({ checked, children }: { checked: boolean; children: ReactNode }) => (
  <View style={styles.warningRow}>
    <Check checked={checked} />
    <Text style={styles.warningText}>{children}</Text>
  </View>
);

const brandIconsBeforeChrysler = [siFord, siNissan];

const brandIconsAfterChrysler = [
  siVolkswagen,
  siRenault,
  siChevrolet,
  siHonda,
  siBmw,
];

const MercedesLogo = () => (
  <Svg viewBox="0 0 24 24" style={styles.mercedesLogo}>
    <Circle cx="12" cy="12" r="10.25" fill="none" stroke={INK} strokeWidth="1.4" />
    <Polygon points="12,2.1 13.15,11.2 12,12.2 10.85,11.2" fill={INK} />
    <Polygon points="21.1,17.6 12.65,13.15 12,12.2 13.3,12.55" fill={INK} />
    <Polygon points="2.9,17.6 10.7,12.55 12,12.2 11.35,13.15" fill={INK} />
  </Svg>
);

const BrandLogoRow = () => (
  <View style={styles.brandLogos}>
    {brandIconsBeforeChrysler.map((icon) => (
      <Svg key={icon.slug} viewBox="0 0 24 24" style={styles.brandLogo}>
        <Path d={icon.path} fill={INK} />
      </Svg>
    ))}
    <Svg viewBox="0 0 24 24" style={styles.chryslerLogo}>
      <Path d={siChrysler.path} fill={INK} />
    </Svg>
    {brandIconsAfterChrysler.map((icon) => (
      <Svg key={icon.slug} viewBox="0 0 24 24" style={styles.brandLogo}>
        <Path d={icon.path} fill={INK} />
      </Svg>
    ))}
    <MercedesLogo />
  </View>
);

export interface ServiceOrderPdfDocumentProps {
  data: ServiceOrderPdfData;
  logoSource: string;
}

export const ServiceOrderPdfDocument = ({ data, logoSource }: ServiceOrderPdfDocumentProps) => {
  const warrantyLabel = data.warrantyMonths === null
    ? 'SIN ESPECIFICAR'
    : data.warrantyMonths === 0
      ? 'SIN GARANTIA'
      : `${data.warrantyMonths} MESES`;
  const vehicleName = [data.brand, data.model, data.modelYear].filter(Boolean).join(' ');

  return (
    <Document
      title={`Orden de servicio ${data.folio}`}
      author="Radiadores Diaz"
      subject="Cotizacion de trabajo o refacciones"
      creator="RefaDiaz System"
    >
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.frame}>
          <View style={styles.header}>
            <View style={styles.logoColumn}>
              <Image src={logoSource} style={styles.logo} />
              <View style={styles.contactBox}>
                <Text style={styles.contactPrimary}>JOSÉ ALVARADO 2008 · LOCS. 29 Y 30</Text>
                <Text style={styles.contactSecondary}>TELS. 81 8359-6091 / 81 8387-1040</Text>
                <Text style={styles.contactSecondary}>radiadoresdiaz.com.mx · info@radiadoresdiaz.com.mx</Text>
              </View>
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

          <View style={styles.reception}>
            <View style={styles.fieldRow}>
              <InlineField label="CLIENTE" value={data.clientName} width="70%" />
              <InlineField label="TEL." value={data.phoneNumber} width="30%" />
            </View>
            <View style={styles.fieldRow}>
              <InlineField label="FALLA" value={data.reportedFailureSummary} width="100%" />
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
              <View style={[styles.columnHeader, { width: '29%' }]}>
                <Text style={styles.columnHeaderText}>TRABAJO / REFACCIÓN AUTORIZADA{`\n`}Y COSTO</Text>
              </View>
              <View style={[styles.columnHeaderLast, { width: '40%' }]}>
                <Text style={styles.columnHeaderText}>OBSERVACIONES DEL FUNCIONAMIENTO O{`\n`}FALLAS DEL AUTOMÓVIL</Text>
              </View>
            </View>
            <View style={styles.diagnosticRows}>
              {data.failures.map((failure, index) => <FailureRow key={`${failure.label}-${index}`} failure={failure} />)}
              <View style={styles.technicalWarnings}>
                <View style={styles.warningCell}>
                  <Warning checked={data.compressionLeakDetected}>FUGA DE COMPRESION DETECTADA. EL VEHICULO NO DEBE CIRCULAR EN ESTAS CONDICIONES.</Warning>
                  <Warning checked={data.coolingSystemAirPressureDetected}>SE ENCUENTRA AIRE EN EL SISTEMA DE ENFRIAMIENTO GENERANDO PRESION CONTROLADA.</Warning>
                </View>
                <View style={styles.warningBlankMiddle} />
                <View style={styles.warningBlankLast} />
              </View>
            </View>
          </View>

          <View style={styles.infoSection}>
            <View style={styles.infoBody}>
              <View style={styles.infoLeft}>
                <Text style={styles.redHeading}>REVISIÓN TÉCNICA</Text>
                <Text style={styles.noteText}>{data.informationalNote || 'Sin nota informativa.'}</Text>
                <View style={styles.obstruction}>
                  <Text style={styles.obstructionLabel}>RADIADOR TAPADO {data.radiatorSerialNumber ? `· SERIE ${data.radiatorSerialNumber}` : ''}</Text>
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
                <Text style={styles.redHeading}>INFORMACIÓN IMPORTANTE</Text>
                <Text style={styles.bodyText}>{data.importantInformation || ' '}</Text>
              </View>
            </View>
            <View style={styles.amountRow}>
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
          </View>

          <View style={styles.signatureArea}>
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
          </View>

          <View style={styles.cutLine}><Text style={styles.cutLabel}>COMPROBANTE PARA EL CLIENTE</Text></View>

          <View style={styles.receipt}>
            <View style={styles.receiptHeader}>
              <Text style={styles.receiptBrand}>RADIADORES DÍAZ</Text>
              <Text style={styles.receiptTitle}>COMPROBANTE DE SERVICIO Y GARANTÍA</Text>
              <Text style={styles.receiptFolio}>N° {data.folio}</Text>
            </View>
            <View style={styles.receiptFields}>
              <View style={styles.fieldRow}>
                <InlineField label="CLIENTE" value={data.clientName} width="65%" />
                <InlineField label="TEL." value={data.phoneNumber} width="35%" />
              </View>
              <View style={styles.fieldRow}>
                <InlineField label="VEHICULO" value={vehicleName} width="45%" />
                <InlineField label="COLOR" value={data.color} width="23%" />
                <InlineField label="PLACAS" value={data.plate} width="32%" />
              </View>
              <View style={styles.fieldRow}>
                <InlineField label="GARANTÍA" value={warrantyLabel} width="36%" />
                <InlineField label="FECHA" value={data.serviceDate} width="28%" />
                <InlineField label="TOTAL" value={money(data.total)} width="36%" />
              </View>
            </View>
          </View>

          <Text style={styles.footer}>JOSE ALVARADO 2008 LOCS. 29 Y 30 COL. LA ESPAÑOLA · TELS. 81 8359-6091 / 81 8387-1040 · MONTERREY, N.L.</Text>
        </View>
      </Page>
    </Document>
  );
};
