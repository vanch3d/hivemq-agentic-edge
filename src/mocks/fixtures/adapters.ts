import type {
  AdaptersList,
  DomainTagList,
  NorthboundMappingList,
  SouthboundMappingList,
  ProtocolAdaptersList,
  StatusList,
} from "@/api/types.gen";

export const adaptersList: AdaptersList = {
  items: [
    {
      id: "opcua-adapter-01",
      type: "opc-ua",
      status: {
        id: "opcua-adapter-01",
        connection: "CONNECTED",
        runtime: "STARTED",
        type: "adapter",
        startedAt: "2026-01-30T08:05:00.000Z",
      },
      config: {
        uri: "opc.tcp://192.168.1.50:4840",
        publishInterval: 1000,
        securityPolicy: "None",
      },
    },
    {
      id: "modbus-adapter-01",
      type: "modbus",
      status: {
        id: "modbus-adapter-01",
        connection: "CONNECTED",
        runtime: "STARTED",
        type: "adapter",
        startedAt: "2026-01-30T08:06:00.000Z",
      },
      config: {
        host: "192.168.1.60",
        port: 502,
        pollingIntervalMillis: 500,
      },
    },
    {
      id: "s7-adapter-01",
      type: "s7",
      status: {
        id: "s7-adapter-01",
        connection: "ERROR",
        runtime: "STARTED",
        type: "adapter",
        message: "Connection refused by PLC",
      },
    },
  ],
};

// --- Per-adapter domain tags ---

export const adapterDomainTags: Record<string, DomainTagList> = {
  "opcua-adapter-01": {
    items: [
      {
        name: "ns=3;s=Temperature",
        description: "Temperature sensor reading",
        definition: { dataType: "Float", accessLevel: "READ" },
      },
      {
        name: "ns=3;s=Pressure",
        description: "Pressure gauge reading",
        definition: { dataType: "Float", accessLevel: "READ" },
      },
    ],
  },
  "modbus-adapter-01": {
    items: [
      {
        name: "holding-register-0",
        description: "Motor speed RPM",
        definition: { dataType: "Int16", register: 0 },
      },
      {
        name: "holding-register-1",
        description: "Motor torque",
        definition: { dataType: "Int16", register: 1 },
      },
    ],
  },
  "s7-adapter-01": {
    items: [
      {
        name: "DB1.DBW0",
        description: "PLC counter value",
        definition: { dataType: "Int", area: "DB", dbNumber: 1, offset: 0 },
      },
    ],
  },
};

// --- Per-adapter northbound mappings ---

export const adapterNorthboundMappings: Record<string, NorthboundMappingList> =
  {
    "opcua-adapter-01": {
      items: [
        {
          tagName: "ns=3;s=Temperature",
          topic: "factory/line1/temperature",
          maxQoS: "AT_LEAST_ONCE",
          includeTimestamp: true,
          includeTagNames: false,
        },
        {
          tagName: "ns=3;s=Pressure",
          topic: "factory/line1/pressure",
          maxQoS: "AT_LEAST_ONCE",
          includeTimestamp: true,
          includeTagNames: false,
        },
      ],
    },
    "modbus-adapter-01": {
      items: [
        {
          tagName: "holding-register-0",
          topic: "factory/motors/speed",
          maxQoS: "AT_MOST_ONCE",
          includeTimestamp: false,
          includeTagNames: false,
        },
      ],
    },
    "s7-adapter-01": {
      items: [],
    },
  };

// --- Per-adapter southbound mappings ---

export const adapterSouthboundMappings: Record<string, SouthboundMappingList> =
  {
    "opcua-adapter-01": {
      items: [],
    },
    "modbus-adapter-01": {
      items: [
        {
          tagName: "holding-register-1",
          topicFilter: "cloud/commands/#",
        },
      ],
    },
    "s7-adapter-01": {
      items: [],
    },
  };

export const adapterTypesList: ProtocolAdaptersList = {
  items: [
    {
      id: "opc-ua",
      protocol: "OPC-UA",
      name: "OPC-UA Adapter",
      description: "Connect to OPC-UA servers",
      version: "1.0.0",
      installed: true,
      capabilities: ["READ", "WRITE", "DISCOVER"],
    },
    {
      id: "modbus",
      protocol: "Modbus",
      name: "Modbus TCP Adapter",
      description: "Connect to Modbus TCP devices",
      version: "1.0.0",
      installed: true,
      capabilities: ["READ", "WRITE"],
    },
    {
      id: "s7",
      protocol: "S7",
      name: "Siemens S7 Adapter",
      description: "Connect to Siemens S7 PLCs",
      version: "1.0.0",
      installed: true,
      capabilities: ["READ", "WRITE"],
    },
  ],
};

export const adapterStatusList: StatusList = {
  items: adaptersList.items.map((a) => a.status!),
};
