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
      type: "opcua",
      status: {
        id: "opcua-adapter-01",
        connection: "CONNECTED",
        runtime: "STARTED",
        type: "adapter",
        startedAt: "2026-01-30T08:05:00.000Z",
      },
      config: {
        uri: "opc.tcp://192.168.1.50:4840",
        overrideUri: false,
        security: { policy: "NONE", messageSecurityMode: "NONE" },
        opcuaToMqtt: { publishingInterval: 1000, serverQueueSize: 1 },
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
        timeoutMillis: 5000,
        modbusToMqtt: {
          pollingIntervalMillis: 500,
          maxPollingErrorsBeforeRemoval: 10,
          publishChangedDataOnly: true,
        },
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
      config: {
        host: "192.168.1.70",
        port: 102,
        controllerType: "S7_1200",
        s7ToMqtt: {
          pollingIntervalMillis: 1000,
          maxPollingErrorsBeforeRemoval: 10,
          publishChangedDataOnly: true,
        },
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

// --- Adapter type definitions with configSchema and uiSchema ---

export const adapterTypesList: ProtocolAdaptersList = {
  items: [
    {
      id: "opcua",
      protocol: "OPC UA",
      name: "OPC UA Protocol Adapter",
      description:
        "Supports Northbound and Southbound communication from and to OPC UA.",
      version: "Development Version",
      logoUrl: "/module/images/opc-ua-icon.jpg",
      author: "HiveMQ",
      installed: true,
      capabilities: ["WRITE", "COMBINE", "DISCOVER", "READ"],
      category: {
        name: "INDUSTRIAL",
        displayName: "Industrial",
        description: "Industrial, typically field bus protocols.",
      },
      tags: [],
      configSchema: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
        properties: {
          id: {
            type: "string",
            title: "Identifier",
            description: "Unique identifier for this protocol adapter",
            minLength: 1,
            maxLength: 1024,
            format: "identifier",
            pattern: "^([a-zA-Z_0-9-_])*$",
          },
          uri: {
            type: "string",
            title: "OPC UA Server URI",
            description: "URI of the OPC UA server to connect to",
            format: "uri",
          },
          overrideUri: {
            type: "boolean",
            title: "Override server returned endpoint URI",
            description:
              "Overrides the endpoint URI returned from the OPC UA server with the hostname and port from the specified URI.",
            default: false,
          },
          security: {
            type: "object",
            properties: {
              policy: {
                type: "string",
                enum: [
                  "NONE",
                  "BASIC128RSA15",
                  "BASIC256",
                  "BASIC256SHA256",
                  "AES128_SHA256_RSAOAEP",
                  "AES256_SHA256_RSAPSS",
                ],
                title: "OPC UA security policy",
                description:
                  "Security policy to use for communication with the server.",
                default: "NONE",
              },
              messageSecurityMode: {
                type: "string",
                enum: ["IGNORED", "NONE", "SIGN", "SIGN_AND_ENCRYPT"],
                title: "Message Security Mode",
                default: "NONE",
              },
            },
            title: "Message Security Configuration",
          },
          auth: {
            type: "object",
            properties: {
              basic: {
                type: "object",
                properties: {
                  username: {
                    type: "string",
                    title: "Username",
                    description: "Username for basic authentication",
                  },
                  password: {
                    type: "string",
                    title: "Password",
                    description: "Password for basic authentication",
                  },
                },
                title: "Basic Authentication",
              },
            },
            title: "Authentication Configuration",
          },
          opcuaToMqtt: {
            type: "object",
            properties: {
              publishingInterval: {
                type: "integer",
                title: "OPC UA publishing interval [ms]",
                description:
                  "OPC UA publishing interval in milliseconds for this subscription on the server",
                default: 1000,
                minimum: 1,
              },
              serverQueueSize: {
                type: "integer",
                title: "OPC UA server queue size",
                default: 1,
                minimum: 1,
              },
            },
            title: "OPC UA To MQTT Config",
          },
        },
        required: ["id", "uri"],
      },
      uiSchema: {
        "ui:tabs": [
          {
            id: "coreFields",
            title: "Connection",
            properties: ["id", "uri", "overrideUri", "security", "auth"],
          },
          {
            id: "opcuaToMqtt",
            title: "OPC UA to MQTT",
            properties: ["opcuaToMqtt"],
          },
        ],
        id: { "ui:disabled": false },
        "ui:order": ["id", "uri", "overrideUri", "security", "auth", "*"],
      },
    },
    {
      id: "modbus",
      protocol: "Modbus TCP",
      name: "Modbus Protocol Adapter",
      description: "Connects HiveMQ Edge to existing Modbus devices.",
      version: "Development Version",
      logoUrl: "/module/images/modbus-icon.png",
      author: "HiveMQ",
      installed: true,
      capabilities: ["DISCOVER", "READ"],
      category: {
        name: "INDUSTRIAL",
        displayName: "Industrial",
        description: "Industrial, typically field bus protocols.",
      },
      tags: ["TCP"],
      configSchema: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
        properties: {
          id: {
            type: "string",
            title: "Identifier",
            description: "Unique identifier for this protocol adapter",
            minLength: 1,
            maxLength: 1024,
            format: "identifier",
            pattern: "^([a-zA-Z_0-9-_])*$",
          },
          host: {
            type: "string",
            title: "Host",
            description:
              "IP Address or hostname of the device you wish to connect to",
            format: "hostname",
          },
          port: {
            type: "integer",
            title: "Port",
            description: "The port number on the device you wish to connect to",
            minimum: 1,
            maximum: 65535,
          },
          timeoutMillis: {
            type: "integer",
            title: "Timeout",
            description:
              "Time (in milliseconds) to await a connection before the client gives up",
            default: 5000,
            minimum: 1000,
            maximum: 15000,
          },
          modbusToMqtt: {
            type: "object",
            properties: {
              maxPollingErrorsBeforeRemoval: {
                type: "integer",
                title: "Max. Polling Errors",
                description:
                  "Max. errors polling the endpoint before the polling daemon is stopped (-1 for unlimited retries)",
                default: 10,
                minimum: -1,
              },
              pollingIntervalMillis: {
                type: "integer",
                title: "Polling Interval [ms]",
                description:
                  "Time in millisecond that this endpoint will be polled",
                default: 1000,
                minimum: 1,
              },
              publishChangedDataOnly: {
                type: "boolean",
                title:
                  "Only publish data items that have changed since last poll",
                default: true,
              },
            },
            title: "Modbus To MQTT Config",
          },
        },
        required: ["host", "id", "modbusToMqtt", "port"],
      },
      uiSchema: {
        "ui:tabs": [
          {
            id: "coreFields",
            title: "Connection",
            properties: ["id", "port", "host", "timeoutMillis"],
          },
          {
            id: "modbusToMqtt",
            title: "Modbus To MQTT",
            properties: ["modbusToMqtt"],
          },
        ],
        id: { "ui:disabled": false },
        port: { "ui:widget": "updown" },
        "ui:order": ["id", "host", "port", "*"],
      },
    },
    {
      id: "s7",
      protocol: "S7",
      name: "S7 Protocol Adapter",
      description:
        "Connects HiveMQ Edge to S7-300, S7-400, S7-1200, S7-1500 & LOGO devices.",
      version: "Development Version",
      logoUrl: "/module/images/s7-icon.png",
      author: "HiveMQ",
      installed: true,
      capabilities: ["READ"],
      category: {
        name: "INDUSTRIAL",
        displayName: "Industrial",
        description: "Industrial, typically field bus protocols.",
      },
      tags: ["TCP", "AUTOMATION", "FACTORY"],
      configSchema: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
        properties: {
          id: {
            type: "string",
            title: "Identifier",
            description: "Unique identifier for this protocol adapter",
            minLength: 1,
            maxLength: 1024,
            format: "identifier",
            pattern: "^([a-zA-Z_0-9-_])*$",
          },
          host: {
            type: "string",
            title: "Host",
            description:
              "IP Address or hostname of the device you wish to connect to",
            format: "hostname",
          },
          port: {
            type: "integer",
            title: "Port",
            description: "The port number on the device you wish to connect to",
            default: 102,
            minimum: 1,
            maximum: 65535,
          },
          controllerType: {
            type: "string",
            enum: ["S7_300", "S7_400", "S7_1200", "S7_1500", "LOGO"],
            title: "S7 Controller Type",
            description: "The type of the S7 Controller",
            default: "S7_300",
          },
          remoteRack: {
            type: "integer",
            title: "Remote Rack",
            description: "Rack value for the remote main CPU (PLC).",
            default: 0,
          },
          remoteSlot: {
            type: "integer",
            title: "Remote Slot",
            description: "Slot value for the remote main CPU (PLC).",
            default: 0,
          },
          s7ToMqtt: {
            type: "object",
            properties: {
              maxPollingErrorsBeforeRemoval: {
                type: "integer",
                title: "Max. Polling Errors",
                description:
                  "Max. errors polling the endpoint before the polling daemon is stopped (-1 for unlimited retries)",
                default: 10,
                minimum: -1,
              },
              pollingIntervalMillis: {
                type: "integer",
                title: "Polling Interval [ms]",
                description:
                  "Time in millisecond that this endpoint will be polled",
                default: 1000,
                minimum: 1,
              },
              publishChangedDataOnly: {
                type: "boolean",
                title:
                  "Only publish data items that have changed since last poll",
                default: true,
              },
            },
            title: "S7 To MQTT Config",
          },
        },
        required: ["controllerType", "host", "id", "port", "s7ToMqtt"],
      },
      uiSchema: {
        "ui:tabs": [
          {
            id: "coreFields",
            title: "Connection",
            properties: ["id", "host", "port"],
          },
          {
            id: "s7",
            title: "S7 Device",
            properties: ["controllerType", "remoteRack", "remoteSlot"],
          },
          {
            id: "subFields",
            title: "S7 To MQTT",
            properties: ["s7ToMqtt"],
          },
        ],
        id: { "ui:disabled": false },
        port: { "ui:widget": "updown" },
        "ui:order": ["id", "host", "port", "*"],
      },
    },
  ],
};

export const adapterStatusList: StatusList = {
  items: adaptersList.items.map((a) => a.status!),
};
