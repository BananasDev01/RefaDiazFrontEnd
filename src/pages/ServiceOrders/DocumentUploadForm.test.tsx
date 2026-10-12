import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import DocumentUploadForm from './DocumentUploadForm';
import { uploadSignedDocument } from '../../services/ServiceDocumentService';
vi.mock('../../services/ServiceDocumentService',()=>({uploadSignedDocument:vi.fn()}));
const token='a'.repeat(64);
const renderForm=()=>{const uploaded=vi.fn();const view=render(<QueryClientProvider client={new QueryClient({defaultOptions:{mutations:{retry:false}}})}><DocumentUploadForm token={token} onUploaded={uploaded} /></QueryClientProvider>);return {...view,uploaded};};
beforeEach(()=>{vi.clearAllMocks();vi.stubGlobal('URL',class extends URL {static createObjectURL(){return 'blob:test';}static revokeObjectURL(){}});});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
describe('carga de hoja firmada',()=>{
  it('solicita cámara trasera y permite elegir archivos sin pedir login',()=>{
    const {container}=renderForm();
    expect(container.querySelector('input[capture]')).toHaveAttribute('capture','environment');
    expect(screen.getByRole('button',{name:'Tomar foto'})).toBeEnabled();
    expect(screen.getByRole('button',{name:'Guardar documento'})).toBeDisabled();
  });
  it('rechaza formatos no permitidos y no conserva una selección anterior',()=>{
    const {container}=renderForm();const input=container.querySelectorAll('input')[1];
    fireEvent.change(input,{target:{files:[new File(['data'],'ok.jpg',{type:'image/jpeg'})]}});
    expect(screen.getByRole('button',{name:'Guardar documento'})).toBeEnabled();
    fireEvent.change(input,{target:{files:[new File(['data'],'bad.svg',{type:'image/svg+xml'})]}});
    expect(screen.getByRole('button',{name:'Guardar documento'})).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('JPG, PNG o PDF');
  });
  it('conserva archivo y token en un reintento, confirmando solo tras éxito',async()=>{
    vi.mocked(uploadSignedDocument).mockRejectedValueOnce(new Error('Sin conexión')).mockResolvedValueOnce({});
    const {container,uploaded}=renderForm();const selected=new File(['%PDF-1.7'],'firmado.pdf',{type:'application/pdf'});
    fireEvent.change(container.querySelectorAll('input')[1],{target:{files:[selected]}});
    fireEvent.click(screen.getByRole('button',{name:'Guardar documento'}));
    await screen.findByText('Sin conexión');expect(uploaded).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Guardar documento'}));
    await waitFor(()=>expect(uploaded).toHaveBeenCalledOnce());
    expect(uploadSignedDocument).toHaveBeenNthCalledWith(1,token,selected);
    expect(uploadSignedDocument).toHaveBeenNthCalledWith(2,token,selected);
  });
});
