import type {
  AdaptersList,
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
