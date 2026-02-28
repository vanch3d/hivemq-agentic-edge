## Adapter Deep Dive

### JsonNode Disambiguation

The API uses `JsonNode` (opaque JSON object) in 9 different contexts. Each has different content:

| Context                           | What it contains                             | Example                                            |
| --------------------------------- | -------------------------------------------- | -------------------------------------------------- |
| Adapter.config                    | Protocol-specific connection settings        | { "host": "192.168.1.10", "port": 502 } for Modbus |
| DomainTag.definition              | Device-specific address/register config      | { "nodeId": "ns=3;s=Temperature" } for OPC-UA      |
| ProtocolAdapter.configSchema      | JSON Schema describing valid adapter configs | Standard JSON Schema object                        |
| ProtocolAdapter.uiSchema          | RJSF UI hints for rendering config forms     | { "host": { "ui:title": "Host" } }                 |
| ProtocolAdapter.tagSchema         | JSON Schema describing valid tag definitions | Standard JSON Schema object                        |
| TagSchema (writing)               | JSON Schema for southbound write payloads    | Standard JSON Schema object                        |
| BehaviorPolicy.behavior.arguments | FSM-specific parameters                      | { "minPublishes": 1, "maxPublishes": 100 }         |
| FunctionSpecs.schema              | JSON Schema for function arguments           | Standard JSON Schema object                        |
| FunctionSpecs.uiSchema            | RJSF UI hints for function argument forms    | RJSF uiSchema object                               |

When the API returns a JsonNode field, interpret it based on the parent entity context.

### Adapter Type Ecosystem

Common protocol adapter types and their capabilities:

| Type       | Protocol                 | Typical capabilities  | Use case                            |
| ---------- | ------------------------ | --------------------- | ----------------------------------- |
| opc-ua     | OPC Unified Architecture | READ, WRITE, DISCOVER | Industrial automation, SCADA        |
| modbus     | Modbus TCP/RTU           | READ, WRITE           | PLCs, motor drives, sensors         |
| s7         | Siemens S7               | READ, WRITE           | Siemens PLCs (S7-300/400/1200/1500) |
| ads        | Beckhoff ADS/TwinCAT     | READ, WRITE           | Beckhoff automation                 |
| eip        | EtherNet/IP (CIP)        | READ                  | Allen-Bradley/Rockwell PLCs         |
| http       | HTTP/REST                | READ                  | Generic REST API data sources       |
| simulation | Simulated data           | READ                  | Testing and development             |

Adapter types are plugins — the available set depends on the Edge installation.
Query available types via listTypes/getType tools.

### Tag Semantics

Tags represent addressable data points on a device. The tag name and definition structure
varies by protocol:

- **OPC-UA**: nodeId (e.g. "ns=3;s=Temperature"), samplingInterval
- **Modbus**: register address, register type (holding, input, coil), data type
- **S7**: DB number, offset, data type, bit position

Tags are the bridge between protocol-specific device addresses and MQTT topics.
A tag must be mapped via NorthboundMapping to publish data to MQTT, or via
SouthboundMapping to receive commands from MQTT.

### Form Generation

Adapter configuration forms are dynamically generated using:

1. **configSchema** (from ProtocolAdapter type) — JSON Schema defining valid config structure
2. **uiSchema** (from ProtocolAdapter type) — RJSF hints for rendering (labels, widgets, ordering)

The UI renders these via react-jsonschema-form (RJSF). When creating/updating adapters,
the config field must conform to the type's configSchema.
