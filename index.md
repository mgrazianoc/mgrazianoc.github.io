# Marco Graziano

> Independent performance engineer specializing in production Rust: tail latency, allocators, concurrency, and memory layout. Available for remote engagements.

Author: [Marco Graziano](https://mgrazianoc.github.io/).
Canonical page: [https://mgrazianoc.github.io/](https://mgrazianoc.github.io/).
Site guide: [llms.txt](https://mgrazianoc.github.io/llms.txt).

![Marco Graziano](https://mgrazianoc.github.io/assets/marco-graziano-764.webp)

performance engineer

**Location**

São Paulo, BR · UTC−3

**Email**

[mgrazianodecastro@gmail.com](mailto:mgrazianodecastro@gmail.com)

**Profiles**

[github](https://github.com/mgrazianoc) · [linkedin](https://www.linkedin.com/in/magcastro/)

Available · fixed-scope engagements

The hot path is the product.\
**The rest waits on it.**

I work on the hot path in production Rust: tail latency, allocators, and concurrency. Sometimes that means finding what a team has spent a quarter failing to reproduce. Sometimes it means designing the path before there is anything to reproduce.

What I take on

-   Latency forensics
-   Concurrency review
-   Lock-free and allocator work
-   Benchmark harnesses that CI can gate on

Modeled latency under load: the mean stays steady while the slowest requests take much longer to recover.

## Common symptoms

Before anything gets profiled, the shape has already narrowed the search. These are the ones I keep meeting, and what each one usually turns out to be.

distribution

### Two modes

One population is taking a different path: a cache that misses, a branch that falls back, a second allocator. The mean lands between the two humps and describes nothing that actually happens.

### A tail that won't close

The body is tight and the right side runs for decades of latency. Almost always queueing or contention, not slow code. p50 will keep looking healthy the entire time this is happening.

### A pile at the edge

Everything above some value got clipped: a timeout, a truncated histogram bucket, a load generator that stopped sending while it waited. The tail you're missing is the one you need.

over time

### Sawtooth

Something accumulates and is released all at once. Page decay, compaction, a buffer filling, a lease expiring. The slope tells you the fill rate and the drop tells you the period.

### A comb

Regular spikes on a fixed interval mean a timer, not load. Flush, checkpoint, metrics scrape, leader renewal. The interval usually names the culprit before any profiling starts.

### Steps under load

Latency holds flat, then jumps to a new floor and holds again. Each step is a resource reaching saturation. Between steps nothing you change will move the number.

Symptoms drawn from models, not from any client system. Yours will be messier and will usually be a mix of two of these.

## What I measure

CPU time is only the part that was running. I also measure where work waited, who woke it, what stayed allocated, and where the pages landed.

on CPU

### Running

Diagram: Temporal CPU heat field linked to an on-CPU flame graph.

FlameScope isolates the bad interval; the flame graph identifies the stack consuming it.

off CPU

### Waiting

Diagram: Off-CPU flame graph weighted by blocked time.

An off-CPU flame graph assigns blocked time to the stack that stopped.

handoffs

### Waking

Diagram: Sparse waker by target matrix weighted by blocked time.

A waker × target matrix shows who released whom, weighted by the target's blocked time.

lifetimes

### Retained

Diagram: Allocation cohort tracks showing short and retained lifetimes.

Allocation lifetimes distinguish normal churn from memory that never returns.

address space

### Mapped

Diagram: Address-space mappings with page residency and fault activity.

Mappings, residency, page size and NUMA placement expose faults hidden above the allocator.

Modeled instruments, not client captures.

## How I work

One thread runs through all four: the hot path and the harness that proves what it does. The difference is when you bring me in.

Before the code exists

### Hot path design

You are building the thing, not fixing it. I design the path the data actually travels: memory layout, concurrency model, and wire format. I build enough of it to prove it holds; your team owns everything around it.

You get

-   The design, with its tradeoffs written down
-   A reference implementation of the hot path
-   A load harness running in CI from day one
-   The failure modes to watch for, named early

When the tail shows up

### Latency audit

I start from the shape of your distribution rather than from the code. What it looks like idle, what it looks like under load, and what moved between the two. The shape cuts the search down to a few mechanisms; measurement decides which one it is.

You get

-   A reproduction you can run on demand
-   The mechanism, measured, not a guess
-   Fixes ranked by gain against effort
-   The harness left behind, yours to keep

Once you know what to change

### Fix and prove

Scoped and quoted after the audit. I implement what the audit found, in your codebase, next to your team. Every change lands with the before and after on the same harness, so the shape you started with stays on the record.

You get

-   The changes, reviewed by your engineers
-   Benchmarks CI can fail a build on
-   Before and after on the same harness
-   A written record of what moved and why

For as long as it ships

### Standing capacity

For teams shipping on a hot path continuously. A fixed number of days a month, booked ahead, so the distribution gets watched between incidents instead of only after one.

You get

-   Design review before the code exists
-   Hot-path and unsafe-block review
-   Regression triage when a number moves
-   Same-week response, in your timezone

**Scope** Engagements are scoped individually. We start with a conversation about the workload, the symptoms, and the constraints. Where further investigation is needed to establish scope, I propose a bounded paid diagnostic. Implementation is quoted separately.\
**Contracting** B2B through my Brazilian entity. Invoiced in USD.\
**Start** Usually two weeks out.\
**Scope call** 45 minutes, free, no deck.\

## Systems

Where the work has been.

### Dados Technology

Industrial IoT streams transformed in real time at millions of messages per second, under sub-second latency requirements.

### Alloha Fibra

A shared service layer connecting dozens of heterogeneous systems across a merged group of regional ISPs, with latency instrumented by route group.

### conDati

Cross-platform marketing analytics pipelines with per-customer backfills ranging from gigabytes to terabytes beneath a feature rules engine.

## Upstream

Merged into Apache Arrow's Swift implementation.

apache/arrow-swift

[Timestamp data type](https://github.com/apache/arrow-swift/pull/33)

apache/arrow-swift #33 · merged Jun 2025

Array, builder and all four precision units, with timezone handling across the C data interface.

[List data types](https://github.com/apache/arrow-swift/pull/39)

apache/arrow-swift #39 · merged Nov 2025

Nested lists end to end: type, array, builder, buffer builder and reader, plus a rename of the struct type to match the rest of the codebase.

Merged downstream into apache/spark-connect-swift (SPARK-54892)

## Writing

General arguments from recurring systems work, not from any one system.

-   [The Cliffhanger: Performance Engineering](https://mgrazianoc.github.io/writing/01/)

    Between bottlenecks and deadlines, the system is still 10x behind.

-   [You're Paying for Someone Else's Problem](https://mgrazianoc.github.io/writing/02/)

    When good practices turn out to be our biggest problem


[All notes](https://mgrazianoc.github.io/writing/)

## The hot path is the work\ I take.

[mgrazianodecastro@gmail.com](mailto:mgrazianodecastro@gmail.com)

São Paulo, BR · UTC−3 · remote\
Fixed-scope engagements, B2B\
[github](https://github.com/mgrazianoc) [linkedin](https://www.linkedin.com/in/magcastro/)
