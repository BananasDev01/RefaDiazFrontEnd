import { describe,expect,it } from 'vitest';
import { buildWriteFields,createFormValues } from './serviceOrderFormData';
import { mapServiceOrderToPdfData } from './pdf/serviceOrderPdfData';
import type { ReportedFailureType,ServiceOrder } from '../../types/serviceOrder.types';
const types:ReportedFailureType[]=[{id:13,code:'OTHER',label:'Otros',displayOrder:130,allowsFreeText:true,active:true}];
const order:ServiceOrder={id:1,externalId:'test',provisionalReference:'TEST',folioSeries:'SER',folioNumber:100,status:'IN_PROGRESS',category:'VEHICLE',clientVehicleId:1,clientId:1,vehicleId:1,compressionLeakDetected:false,taxAmount:0,total:600,subtotal:600,lineTotalsMode:'LINES',clientSnapshot:{},vehicleSnapshot:{},legalTextSnapshot:{},version:1,items:[],reportedFailures:[100,200,300].map((amount,index)=>({id:index+1,externalId:`row-${index}`,reportedFailureTypeId:13,failureCodeSnapshot:'OTHER',labelSnapshot:'Otros',displayOrderSnapshot:130,amount,observation:`Detalle ${index+1}`}))};
describe('renglones Otros repetibles',()=>{
  it('recupera y guarda todos los renglones sin confundir UUIDs, importes u observaciones',()=>{
    const values=createFormValues(types,order);
    expect(values.reportedFailures).toHaveLength(3);
    const payload=buildWriteFields(values,types);
    expect(payload.reportedFailures.map(row=>row.externalId)).toEqual(['row-0','row-1','row-2']);
    expect(payload.subtotal).toBe(600);
    values.reportedFailures.splice(1,1);
    expect(buildWriteFields(values,types).subtotal).toBe(400);
    expect(buildWriteFields(values,types).reportedFailures.map(row=>row.observation)).toEqual(['Detalle 1','Detalle 3']);
  });
  it('imprime todos los Otros y mantiene el folio interno intacto',()=>{
    const pdf=mapServiceOrderToPdfData(order,types);
    expect(pdf.failures.map(row=>row.amount)).toEqual([100,200,300]);
    expect(pdf.folio).toBe('0100'); expect(order.folioSeries).toBe('SER');
  });
  it('asigna identidad estable a los renglones nuevos antes del primer guardado',()=>{
    const values=createFormValues(types); values.reportedFailures[0].selected=true;
    expect(buildWriteFields(values,types).reportedFailures[0].externalId).toBe(buildWriteFields(values,types).reportedFailures[0].externalId);
  });
});
