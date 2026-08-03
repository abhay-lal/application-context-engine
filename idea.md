# Application Context Engine
### An AI-Native Intermediate Representation for TypeScript Applications

CLI: `ace`

> "Humans interact with pixels. AI should interact with semantics."

---

# Motivation

Modern AI agents interact with software in one of three ways:

1. Vision (screenshots)
2. Accessibility Trees
3. APIs / MCP

Each has limitations.

### Vision

The model must understand

- pixels
- layout
- icons
- OCR
- UI structure

This is expensive, slow, and token intensive.

### Accessibility Trees

Better than vision, but still UI-centric.

Example

```json
{
    "role":"button",
    "name":"Submit"
}
```

This tells the model **what the UI element is**, but not **what it actually means**.

### APIs / MCP

Great when they exist.

However,

- many applications don't expose them
- they expose operations, not application semantics
- they don't describe workflows, objects or state

---

# Core Idea

Instead of exposing

```
Pixels
```

or

```
Accessibility Trees
```

compile a TypeScript application into an **AI-native Application Context IR**.

```
React + TypeScript

↓

Application Context Engine

↓

Application Context IR (ACIR)

↓

LLM / MCP / Agents
```

The graph represents

- objects
- actions
- state
- workflows
- relationships
- capabilities

rather than UI components.

---

# Vision

An LLM should never need to ask

> "Where is the Submit button?"

Instead it should ask

> "What actions are currently available?"

---

# Example

React

```tsx
<Button
    disabled={!canApprove}
    onClick={approveInvoice}
>
    Approve
</Button>
```

Today

```
Button
```

Accessibility

```json
{
  "role":"button",
  "name":"Approve"
}
```

ACIR

```json
{
    "id":"approve",

    "kind":"Action",

    "label":"Approve Invoice",

    "handler":"approveInvoice",

    "enabled":"canApprove",

    "requires":[
        "Invoice"
    ],

    "effects":[
        "Invoice.status = Approved"
    ]
}
```

The LLM reasons over intent instead of pixels.

---

# What makes this different?

Current code intelligence systems understand

```
Files

↓

Functions

↓

Imports

↓

Classes
```

They answer

> Where is this function?

Application Context Engine answers

> What does this application do?

---

# Goals

Convert a React + TypeScript codebase into an Application Context IR.

The graph should capture

- UI hierarchy
- Application objects
- User actions
- State
- State transitions
- Navigation
- Workflows
- Permissions
- Side effects

---

# Proposed Graph Schema

## Object

```json
{
    "id":"invoice",

    "kind":"Object",

    "properties":[
        "status",
        "amount"
    ]
}
```

---

## Action

```json
{
    "id":"approve",

    "kind":"Action",

    "handler":"approveInvoice",

    "effects":[
        "Invoice.status=Approved"
    ]
}
```

---

## State

```json
{
    "id":"canApprove",

    "kind":"State",

    "source":"React Hook",

    "type":"boolean"
}
```

---

## Route

```json
{
    "from":"/invoice",

    "to":"/invoice/:id"
}
```

---

## Relationship

```
Invoice

↓

Approve

↓

API

↓

Success

↓

Navigate
```

---

# Pipeline

```
TypeScript Source

↓

TypeScript Compiler API

↓

AST

↓

React Component Analysis

↓

State Analysis

↓

Control Flow

↓

Action Extraction

↓

Application Context IR
```

---

# Static Analysis

Extract

## Components

- Button
- Table
- Form
- Dialog

---

## Hooks

- useState
- useReducer
- useContext
- useMemo
- useEffect

---

## Routing

- React Router
- Next.js
- TanStack

---

## Actions

Infer

```
onClick

↓

handler

↓

API

↓

mutation

↓

state update
```

---

## State

Track

```
isLoading

↓

button disabled

↓

spinner

↓

toast
```

---

## API Calls

Infer

```
POST /invoice

↓

creates Invoice
```

instead of simply

```
fetch(...)
```

---

# Query Examples

Instead of asking the codebase

```
Find approveInvoice()
```

Agents ask

```
What actions can the user perform?

What object does this page represent?

What state transitions exist?

Which actions mutate Invoice?

What happens after Submit?

What workflows require authentication?
```

---

# MCP Integration

Expose the graph through an MCP server.

Tools

```
discoverObjects()

discoverActions()

discoverRoutes()

discoverWorkflow()

findObject()

findAction()

findState()

describePage()
```

instead of

```
click()

type()

scroll()
```

---

# Stretch Goal

Runtime enrichment.

Combine

Static Application Context IR

+

Running Application

↓

Live Application Context IR

Example

```
Invoice

Status

Pending

Available Actions

Approve

Reject

Assign

Current User

Manager
```

Now agents understand both

- code
- runtime

---

# Possible Stack

Parser

- TypeScript Compiler API
- ts-morph

React

- Babel
- SWC

Graph

- Neo4j
- JSON-LD
- Graphology

MCP

- TypeScript MCP SDK

Visualization

- React Flow
- Cytoscape

---

# MVP

Input

```
npx ace build ./my-react-app
```

Output

```
context-ir.json
```

Example

```json
{
    "objects":[
        "Invoice",
        "Customer"
    ],

    "actions":[
        "Approve",
        "Reject"
    ],

    "routes":[
        "/invoice",
        "/customers"
    ]
}
```

---

# CLI Surface (vision)

`ace build` is the only command implemented in V0. The rest sketch where the CLI grows as later roadmap items land.

```
ace build       # compile source → context-ir.json (V0)
ace serve       # MCP server over the IR (V3)
ace visualize   # render the IR as a graph (V2)
ace inspect     # query a single object/action/route from the IR
ace query       # ask a natural-language question over the IR
```

---

# Roadmap

## V1

- React
- TypeScript
- Components
- Routes
- Hooks
- Action Graph

---

## V2

- API inference
- State graph
- Workflow extraction
- Graph visualization

---

## V3

- MCP server
- Runtime instrumentation
- Live Application Context IR

---

## V4

Support

- Next.js
- Vue
- Angular
- Solid
- React Native

---

# Long-Term Vision

Today

```
Application

↓

HTML

↓

Browser

↓

Pixels

↓

LLM
```

Tomorrow

```
Application

↓

Application Context IR

↓

LLM
```

The UI remains for humans.

The Application Context IR becomes the primary interface for AI agents.

---

# Open Research Questions

- Can application semantics be inferred reliably from static analysis alone?
- How much token reduction does the Application Context IR provide compared to screenshots and accessibility trees?
- Does reasoning over an Application Context IR improve agent success rates?
- Can runtime instrumentation refine static semantics?
- Can the Application Context IR generalize into a framework-agnostic intermediate representation for AI-native applications, beyond React/TypeScript?

---

# Success Criteria

An agent should be able to answer

- What can the user do?
- What data exists?
- What state is changing?
- What workflows are available?
- What will happen if this action executes?

without

- screenshots
- OCR
- DOM parsing
- accessibility trees
- browser automation

Only by reasoning over the Application Context IR.