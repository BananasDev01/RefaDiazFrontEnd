import { http, HttpResponse } from 'msw';
import type { Brand } from '../types/brand.types';
import type { CarModel } from '../types/model.types';
import type { Provider } from '../types/provider.types';
import type { Product } from '../types/product.types';
import type {
  AddClientVehiclesRequest,
  Client,
  ClientCreateRequest,
  ClientVehicleInput,
} from '../types/client.types';
import type {
  VehicleNote,
  VehicleNoteUpsertPayload,
} from '../types/vehicleNote.types';

const apiBaseUrl = import.meta.env.VITE_API_REFA_BASE_PATH || '/api';

const mockBrands: Brand[] = [
  { id: 201, name: 'Honda', brandTypeId: 1 },
  { id: 202, name: 'Ford', brandTypeId: 1 },
  { id: 203, name: 'Nissan', brandTypeId: 1 },
];

const mockModels: CarModel[] = [
  {
    id: 101,
    name: 'Civic',
    brandId: 201,
    brand: mockBrands[0],
  },
  {
    id: 102,
    name: 'Versa',
    brandId: 203,
    brand: mockBrands[2],
  },
  {
    id: 103,
    name: 'Lobo',
    brandId: 202,
    brand: mockBrands[1],
  },
  {
    id: 104,
    name: 'F150',
    brandId: 202,
    brand: mockBrands[1],
  },
];

const getCarModelById = (carModelId: number | null | undefined) => {
  if (!carModelId) {
    return null;
  }

  return mockModels.find((model) => model.id === carModelId) ?? null;
};

// Exporta los datos originales para poder reiniciarlos en los tests
export const originalMockProviders: Provider[] = [
  {
    id: 1,
    name: 'Proveedor de Maquinaria Pesada S.A. de C.V.',
    phoneNumber: '55-1234-5678',
    address: 'Av. Industrial #123, Parque Industrial, Querétaro, Qro.',
    comments: 'Contacto principal: Juan Pérez. Entrega los martes y jueves.',
    active: true,
    createdAt: '2023-10-26T10:00:00Z',
    updatedAt: '2023-10-26T10:00:00Z',
  },
  {
    id: 2,
    name: 'Refacciones y Partes "El Veloz"',
    phoneNumber: '81-8765-4321',
    address: 'Calle del Taller #45, Col. Centro, Monterrey, NL.',
    comments: 'Preguntar por Engracia. Suelen tener descuentos por volumen.',
    active: true,
    createdAt: '2023-05-15T14:30:00Z',
    updatedAt: '2024-01-20T11:00:00Z',
  },
  {
    id: 3,
    name: 'Suministros Industriales del Sureste',
    phoneNumber: '99-9876-5432',
    address: 'Carretera a Progreso Km 5, Mérida, Yuc.',
    active: false,
    createdAt: '2022-11-30T18:00:00Z',
    updatedAt: '2023-09-01T09:45:00Z',
  },
];

const originalMockProducts: Product[] = [
  {
    id: 1,
    name: 'Radiador de Aluminio para Civic',
    productTypeId: 1,
    stockCount: 15,
    comments: 'Radiador de alto rendimiento',
    dpi: 'RD-HON-CIV-1822',
    files: [],
    productProviders: [],
    productPrices: [],
    productCarModels: [
      {
        carModelId: 101,
        initialYear: 2018,
        lastYear: 2022,
        carModel: mockModels[0],
      },
    ],
  },
  {
    id: 2,
    name: 'Bomba de Agua para Lobo',
    productTypeId: 2,
    stockCount: 30,
    comments: 'Bomba de agua original',
    dpi: 'BA-FOR-LOB-1520',
    files: [],
    productProviders: [],
    productPrices: [],
    productCarModels: [
      {
        carModelId: 103,
        initialYear: 2015,
        lastYear: 2020,
        carModel: mockModels[2],
      },
    ],
  },
  {
    id: 3,
    name: 'Filtro de Aire K&N',
    productTypeId: 3,
    stockCount: 50,
    comments: 'Filtro de alto flujo lavable',
    dpi: 'FA-KN-UNIV',
    files: [],
    productProviders: [],
    productPrices: [],
    productCarModels: [
      {
        carModelId: 101,
        initialYear: 2000,
        lastYear: 2024,
        carModel: mockModels[0],
      },
      {
        carModelId: 103,
        initialYear: 2000,
        lastYear: 2024,
        carModel: mockModels[2],
      },
    ],
  },
];

const originalMockVehicleNotes: VehicleNote[] = [
  {
    id: 1,
    title: 'Procedimiento de purga',
    contentMarkdown: '# Procedimiento de purga\n\n- Revisar abanico\n- No abrir en caliente',
    carModelId: 103,
    carModel: mockModels[2],
    files: [
      {
        id: 90,
        name: 'purga-1.png',
        mimeType: 'image/png',
        storagePath: 'vehicle-notes/images/purga-1.png',
        orderId: 1,
        fileTypeId: 3,
      },
    ],
    active: true,
    createdAt: '2026-03-10T10:00:00',
    updatedAt: '2026-03-10T10:00:00',
  },
  {
    id: 2,
    title: 'Torque de ventilador',
    contentMarkdown: 'Aplicar el torque especificado por fabricante antes de cerrar el conjunto.',
    carModelId: 101,
    carModel: mockModels[0],
    files: [],
    active: true,
    createdAt: '2026-03-09T10:00:00',
    updatedAt: '2026-03-09T10:00:00',
  },
  {
    id: 3,
    title: 'Revision general de sistema',
    contentMarkdown: '## Diagnostico rapido\n\n1. Revisar fugas\n2. Confirmar termostato',
    carModelId: null,
    carModel: null,
    files: [],
    active: true,
    createdAt: '2026-03-08T10:00:00',
    updatedAt: '2026-03-08T10:00:00',
  },
];

const originalMockClients: Client[] = [
  {
    id: 1,
    externalId: '5b3c57af-8510-42f0-a1f8-8ce91a8ca101',
    clientName: 'Pedro Antonio Félix',
    phoneNumber: '8125049511',
    phoneNormalized: '8125049511',
    comments: 'Cliente frecuente',
    active: true,
    vehicles: [
      {
        clientVehicleId: 11,
        id: 101,
        externalId: '2e89c98b-c211-4358-8d6d-6a13a9f93101',
        carModelId: 103,
        modelYear: 2006,
        version: 'SE',
        color: 'Gris',
        plate: 'RKU483B',
        plateNormalized: 'RKU483B',
        comments: null,
        active: true,
        carModel: {
          id: 103,
          name: 'Lobo',
          brand: { id: 202, name: 'Ford' },
        },
      },
    ],
  },
  {
    id: 2,
    externalId: '7efb3862-3922-4363-9869-04791432e102',
    clientName: 'María del Rosario',
    phoneNumber: '8185550102',
    phoneNormalized: '8185550102',
    active: true,
    vehicles: [],
  },
];

let mockProviders: Provider[] = JSON.parse(JSON.stringify(originalMockProviders));
let mockProducts: Product[] = JSON.parse(JSON.stringify(originalMockProducts));
let mockVehicleNotes: VehicleNote[] = JSON.parse(JSON.stringify(originalMockVehicleNotes));
let mockClients: Client[] = JSON.parse(JSON.stringify(originalMockClients));

export const resetMockProviders = () => {
  mockProviders = JSON.parse(JSON.stringify(originalMockProviders));
};

export const resetMockProducts = () => {
  mockProducts = JSON.parse(JSON.stringify(originalMockProducts));
};

export const resetMockVehicleNotes = () => {
  mockVehicleNotes = JSON.parse(JSON.stringify(originalMockVehicleNotes));
};

export const resetMockClients = () => {
  mockClients = JSON.parse(JSON.stringify(originalMockClients));
};

const vehicleFromInput = (input: ClientVehicleInput, clientVehicleId: number) => {
  const carModel = getCarModelById(input.carModelId);
  return {
    clientVehicleId,
    id: clientVehicleId + 1000,
    externalId: input.externalId,
    carModelId: input.carModelId ?? null,
    modelYear: input.modelYear ?? null,
    version: input.version ?? null,
    color: input.color ?? null,
    plate: input.plate ?? null,
    plateNormalized: input.plate?.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() ?? null,
    comments: input.comments ?? null,
    active: true,
    carModel: carModel
      ? {
          id: carModel.id,
          name: carModel.name,
          brand: carModel.brand
            ? { id: carModel.brand.id, name: carModel.brand.name }
            : undefined,
        }
      : null,
  };
};

const getVehicleNoteById = (id: number) =>
  mockVehicleNotes.find((note) => note.id === id);

const buildVehicleNoteFromPayload = (
  payload: VehicleNoteUpsertPayload,
  currentNote?: VehicleNote
): VehicleNote => {
  const currentFiles = currentNote?.files ?? [];
  const nextFiles = payload.files?.map((file, index) => ({
    id: file.id ?? currentFiles[index]?.id ?? Date.now() + index,
    name: file.name,
    mimeType: file.mimeType,
    storagePath: file.storagePath,
    orderId: file.orderId,
    fileTypeId: 3,
  })) ?? currentFiles;

  return {
    id: currentNote?.id,
    title: payload.title ?? currentNote?.title ?? '',
    contentMarkdown: payload.contentMarkdown ?? currentNote?.contentMarkdown ?? '',
    carModelId: payload.carModelId ?? null,
    carModel: getCarModelById(payload.carModelId ?? null),
    files: nextFiles,
    active: payload.active ?? currentNote?.active ?? true,
    createdAt: currentNote?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

export const handlers = [
  http.get(`${apiBaseUrl}/clients`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q')?.toLowerCase() ?? '';
    const limit = Number(url.searchParams.get('limit') ?? 50);
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const filteredClients = query
      ? mockClients.filter((client) => {
          const searchable = [
            client.clientName,
            client.phoneNumber,
            ...client.vehicles.flatMap((vehicle) => [
              vehicle.plate,
              vehicle.modelYear,
              vehicle.carModel?.name,
              vehicle.carModel?.brand?.name,
            ]),
          ].filter(Boolean).join(' ').toLowerCase();
          return searchable.includes(query);
        })
      : mockClients;

    return HttpResponse.json({
      data: filteredClients.slice(offset, offset + limit),
      pagination: { limit, offset, total: filteredClients.length },
    });
  }),

  http.get(`${apiBaseUrl}/clients/:clientId`, ({ params }) => {
    const client = mockClients.find((item) => item.id === Number(params.clientId));
    return client
      ? HttpResponse.json(client)
      : new HttpResponse(null, { status: 404 });
  }),

  http.post(`${apiBaseUrl}/clients`, async ({ request }) => {
    const payload = await request.json() as ClientCreateRequest;
    const existingClient = mockClients.find(
      (client) => client.phoneNormalized === payload.phoneNumber.replace(/\D/g, '')
    );

    if (existingClient) {
      const nextVehicleId = Math.max(0, ...mockClients.flatMap((client) => client.vehicles.map((vehicle) => vehicle.clientVehicleId))) + 1;
      existingClient.vehicles.push(
        ...(payload.vehicles ?? []).map((vehicle, index) => vehicleFromInput(vehicle, nextVehicleId + index))
      );
      return HttpResponse.json({ ...existingClient, reconciledByPhone: true });
    }

    const id = Math.max(...mockClients.map((client) => client.id)) + 1;
    const nextClient: Client = {
      id,
      externalId: payload.externalId,
      clientName: payload.clientName,
      phoneNumber: payload.phoneNumber,
      phoneNormalized: payload.phoneNumber.replace(/\D/g, ''),
      comments: payload.comments ?? undefined,
      active: true,
      vehicles: (payload.vehicles ?? []).map((vehicle, index) => vehicleFromInput(vehicle, 100 + index)),
    };
    mockClients.push(nextClient);
    return HttpResponse.json(nextClient, { status: 201 });
  }),

  http.post(`${apiBaseUrl}/clients/:clientId/vehicles`, async ({ params, request }) => {
    const client = mockClients.find((item) => item.id === Number(params.clientId));
    if (!client) return new HttpResponse(null, { status: 404 });

    const payload = await request.json() as AddClientVehiclesRequest;
    const inputs = 'vehicle' in payload ? [payload.vehicle] : payload.vehicles;
    const nextVehicleId = Math.max(0, ...mockClients.flatMap((item) => item.vehicles.map((vehicle) => vehicle.clientVehicleId))) + 1;
    client.vehicles.push(...inputs.map((vehicle, index) => vehicleFromInput(vehicle, nextVehicleId + index)));
    return HttpResponse.json(client, { status: 201 });
  }),

  http.get(`${apiBaseUrl}/providers`, () => {
    return HttpResponse.json({
      providers: mockProviders,
      totalCount: mockProviders.length,
    });
  }),

  http.put(`${apiBaseUrl}/providers`, async ({ request }) => {
    const idParam = request.url.split('?')[1].split('=')[1];
    if (!idParam) {
      return new HttpResponse(null, { status: 400 });
    }

    const id = Number(idParam);
    const updates = await request.json() as Partial<Provider>;
    const providerIndex = mockProviders.findIndex((provider) => provider.id === id);

    if (providerIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }

    mockProviders[providerIndex] = { ...mockProviders[providerIndex], ...updates };

    return HttpResponse.json(mockProviders[providerIndex]);
  }),

  http.delete(`${apiBaseUrl}/providers`, ({ request }) => {
    const idParam = request.url.split('?')[1].split('=')[1];
    if (!idParam) {
      return new HttpResponse(null, { status: 400 });
    }

    const id = Number(idParam);
    const providerIndex = mockProviders.findIndex((provider) => provider.id === id);

    if (providerIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }

    mockProviders.splice(providerIndex, 1);

    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${apiBaseUrl}/brands`, () => HttpResponse.json(mockBrands)),

  http.get(`${apiBaseUrl}/models`, ({ request }) => {
    const url = new URL(request.url);
    const brandId = url.searchParams.get('brandId');

    if (!brandId) {
      return HttpResponse.json(mockModels);
    }

    return HttpResponse.json(
      mockModels.filter((model) => model.brandId === Number(brandId))
    );
  }),

  http.post(`${apiBaseUrl}/models`, async ({ request }) => {
    const payload = await request.json() as Pick<CarModel, 'name' | 'brandId'>;
    const brand = mockBrands.find((item) => item.id === payload.brandId);

    if (!brand) {
      return new HttpResponse(null, { status: 400 });
    }

    const newModel: CarModel = {
      id: Math.max(...mockModels.map((model) => model.id)) + 1,
      name: payload.name,
      brandId: payload.brandId,
      brand,
    };

    mockModels.push(newModel);

    return HttpResponse.json(newModel, { status: 201 });
  }),

  http.delete(`${apiBaseUrl}/models`, ({ request }) => {
    const idParam = request.url.split('?')[1].split('=')[1];
    if (!idParam) {
      return new HttpResponse(null, { status: 400 });
    }

    const modelId = Number(idParam);
    const modelIndex = mockModels.findIndex((model) => model.id === modelId);

    if (modelIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }

    mockModels.splice(modelIndex, 1);

    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${apiBaseUrl}/products`, ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const productTypeId = url.searchParams.get('productTypeId');
    const brandId = url.searchParams.get('brandId');
    const modelId = url.searchParams.get('modelId');
    const modelYear = url.searchParams.get('modelYear');
    const q = url.searchParams.get('q');
    const limit = url.searchParams.get('limit');
    const offset = url.searchParams.get('offset');

    if (id) {
      const product = mockProducts.find((item) => item.id === Number(id));
      return product ? HttpResponse.json(product) : new HttpResponse(null, { status: 404 });
    }

    let filteredProducts = mockProducts;

    if (productTypeId) {
      filteredProducts = filteredProducts.filter(
        (product) => product.productTypeId === Number(productTypeId)
      );
    }

    if (brandId) {
      filteredProducts = filteredProducts.filter((product) =>
        product.productCarModels.some(
          (productCarModel) => productCarModel.carModel?.brand?.id === Number(brandId)
        )
      );
    }

    if (modelId) {
      filteredProducts = filteredProducts.filter((product) =>
        product.productCarModels.some(
          (productCarModel) => productCarModel.carModel.id === Number(modelId)
        )
      );
    }

    if (modelYear) {
      const year = Number(modelYear);
      filteredProducts = filteredProducts.filter((product) =>
        product.productCarModels.some((productCarModel) =>
          productCarModel.initialYear !== undefined
          && productCarModel.initialYear !== null
          && productCarModel.lastYear !== undefined
          && productCarModel.lastYear !== null
          && productCarModel.initialYear <= year
          && productCarModel.lastYear >= year
        )
      );
    }

    if (q) {
      filteredProducts = filteredProducts.filter((product) =>
        product.name.toLowerCase().includes(q.toLowerCase())
        || (product.dpi && product.dpi.toLowerCase().includes(q.toLowerCase()))
      );
    }

    if (limit !== null || offset !== null) {
      const parsedLimit = limit ? Number(limit) : filteredProducts.length;
      const parsedOffset = offset ? Number(offset) : 0;

      return HttpResponse.json({
        data: filteredProducts.slice(parsedOffset, parsedOffset + parsedLimit),
        pagination: {
          limit: parsedLimit,
          offset: parsedOffset,
          total: filteredProducts.length,
        },
      });
    }

    return HttpResponse.json(filteredProducts);
  }),

  http.post(`${apiBaseUrl}/products`, async ({ request }) => {
    const payload = await request.json() as Product;
    const newProduct = {
      ...payload,
      id: Math.max(...mockProducts.map((product) => product.id ?? 0)) + 1,
    };

    mockProducts.push(newProduct);

    return HttpResponse.json(newProduct, { status: 201 });
  }),

  http.put(`${apiBaseUrl}/products`, async ({ request }) => {
    const idParam = request.url.split('?')[1].split('=')[1];
    if (!idParam) {
      return new HttpResponse(null, { status: 400 });
    }

    const id = Number(idParam);
    const payload = await request.json() as Product;
    const productIndex = mockProducts.findIndex((product) => product.id === id);

    if (productIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }

    mockProducts[productIndex] = {
      ...mockProducts[productIndex],
      ...payload,
      id,
    };

    return HttpResponse.json(mockProducts[productIndex]);
  }),

  http.delete(`${apiBaseUrl}/products`, ({ request }) => {
    const idParam = request.url.split('?')[1].split('=')[1];
    if (!idParam) {
      return new HttpResponse(null, { status: 400 });
    }

    const id = Number(idParam);
    mockProducts = mockProducts.filter((product) => product.id !== id);

    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${apiBaseUrl}/vehicle-notes`, ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const q = url.searchParams.get('q');
    const brandId = url.searchParams.get('brandId');
    const carModelId = url.searchParams.get('carModelId');

    if (id) {
      const note = getVehicleNoteById(Number(id));
      if (!note || note.active === false) {
        return new HttpResponse(null, { status: 404 });
      }

      return HttpResponse.json(note);
    }

    let filteredNotes = mockVehicleNotes.filter((note) => note.active !== false);

    if (q) {
      const normalizedQuery = q.toLowerCase();
      filteredNotes = filteredNotes.filter((note) =>
        note.title.toLowerCase().includes(normalizedQuery)
        || note.carModel?.name?.toLowerCase().includes(normalizedQuery)
        || note.carModel?.brand?.name?.toLowerCase().includes(normalizedQuery)
      );
    }

    if (brandId) {
      filteredNotes = filteredNotes.filter(
        (note) => note.carModel?.brand?.id === Number(brandId)
      );
    }

    if (carModelId) {
      filteredNotes = filteredNotes.filter(
        (note) => note.carModelId === Number(carModelId)
      );
    }

    filteredNotes.sort((left, right) => (
      new Date(right.createdAt ?? '').getTime() - new Date(left.createdAt ?? '').getTime()
    ));

    return HttpResponse.json(filteredNotes);
  }),

  http.post(`${apiBaseUrl}/vehicle-notes`, async ({ request }) => {
    const payload = await request.json() as VehicleNoteUpsertPayload;
    const nextId = Math.max(...mockVehicleNotes.map((note) => note.id ?? 0)) + 1;
    const nextNote = {
      ...buildVehicleNoteFromPayload(payload),
      id: nextId,
      active: payload.active ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockVehicleNotes.unshift(nextNote);

    return HttpResponse.json(nextNote, { status: 201 });
  }),

  http.put(`${apiBaseUrl}/vehicle-notes`, async ({ request }) => {
    const idParam = request.url.split('?')[1]?.split('=')[1];
    if (!idParam) {
      return new HttpResponse(null, { status: 400 });
    }

    const id = Number(idParam);
    const payload = await request.json() as VehicleNoteUpsertPayload;
    const noteIndex = mockVehicleNotes.findIndex((note) => note.id === id);

    if (noteIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }

    const updatedNote = {
      ...buildVehicleNoteFromPayload(payload, mockVehicleNotes[noteIndex]),
      id,
      createdAt: mockVehicleNotes[noteIndex].createdAt,
      updatedAt: new Date().toISOString(),
    };

    mockVehicleNotes[noteIndex] = updatedNote;

    return HttpResponse.json(updatedNote);
  }),

  http.delete(`${apiBaseUrl}/vehicle-notes`, ({ request }) => {
    const idParam = request.url.split('?')[1]?.split('=')[1];
    if (!idParam) {
      return new HttpResponse(null, { status: 400 });
    }

    const id = Number(idParam);
    const noteIndex = mockVehicleNotes.findIndex((note) => note.id === id);

    if (noteIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }

    mockVehicleNotes[noteIndex] = {
      ...mockVehicleNotes[noteIndex],
      active: false,
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json(mockVehicleNotes[noteIndex]);
  }),
];
