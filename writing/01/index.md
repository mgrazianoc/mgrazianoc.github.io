# The Cliffhanger: Performance Engineering

> Why systems stay 10x behind after the obvious optimizations: tail latency, misleading benchmarks, and the hard part of performance engineering.

Author: [Marco Graziano](https://mgrazianoc.github.io/).
Canonical page: [https://mgrazianoc.github.io/writing/01/](https://mgrazianoc.github.io/writing/01/).
Site guide: [llms.txt](https://mgrazianoc.github.io/llms.txt).

Between bottlenecks and deadlines, the system is still 10x behind.

![A pixel cat hanging from a wire. Hanging in there.](https://mgrazianoc.github.io/writing/01/hanging-in-there.webp)

Faster is awesome, and most companies will never have to worry about improving performance beyond hundreds of milliseconds. For the cases that do care, it usually boils down to two scenarios:

-   the company is trying to penetrate a market by offering a competitive product, or service, whose main difference is its performance; or
-   the company is on a train that will not stop, and it will crash into huge bills, poor user experience, or even worse: software that never runs.

Take, for example, some companies that in the past had to deal with performance in order for their product to remain competitive in the market.

**Google**: their search engine not only had to carry good features for retrieving good results, but it also had to be fast. If their page spent too much time "thinking", well, there was a good chance the user would just give up. The index could be perfect; if the path was slow, then it was not a search. That is their product.

**Apple**: when John Doerr saw the product for the first time, Steve Jobs said "this device nearly broke the company". What was so good about it? Smoothness. Nothing back in the day ever felt like that. The tactile response time behaved like the physical world, at least compared to human perception. It was not the first "smartphone", but it was the first one that ever felt good enough.

**Nasdaq**: a big B2B failure case. On May 18, 2012, Facebook's IPO day, before any trading could even start, the exchange had to make sure they correctly computed the opening price from every single order. If someone canceled while they were computing, they had to compute everything again. At first, this looked like a simple sum / subtraction problem. They had tested it with 40,000 orders. But that day, they got almost 500,000. People just kept canceling, and the system kept starting over. As a consequence, trading opened half an hour late, and market makers spent hours not knowing which of their trades had gone through. The brokers claimed almost [$500 million in losses](https://www.investmentnews.com/nasdaq-to-pay-10-million-to-settle-sec-facebook-case-51723)...

`ipo_cross.rs`

```rust
// Nasdaq's IPO cross, more or less.
// Tested with 40_000 orders. Works on my machine.
loop {
    let cross = compute_opening_cross(&book);
    if book.no_cancellations_since(&cross) {
        break; // surely people stop canceling at some point
    }
}
open_trading();
```

## At first...

Everything feels straightforward to tackle. Improving a SQL query, some network logic, algorithm optimizations, the everyday bread and butter. "Everything will be ready within the scheduled deadline." After a few tries and some handmade benchmarks, the harsh reality of software engineering shatters right in our face. We've tried everything we knew right off the top of our heads. Everything a solid senior engineer has learned throughout their career. All the best practices. All the experience. EVERYTHING. Yet... the system is not even 10% there.

And that's just for what was measured. In scenarios where the mean is not the only number that matters (it never is), p99+ quantiles are poorly understood monsters. Their radical behavior?

> Ohh, that's OS jitter...

Yes, OS jitter. Let's just ignore the bizarre multimodal distribution the system has... which cannot even hold stable over time.

At this point, for those companies, performance engineering starts becoming a real term. Coding suddenly switches from making code recognizable by humans, and easy to digest, to something the machine doesn't have to juggle just to move variables around. Those tiny but furious lines of code scare you at first, but it soon clicks. Full-batch end-to-end software that runs in microseconds is extremely hard to build.

![A pixel progress window. Optimizing. Time remaining: 2 sprints.](https://mgrazianoc.github.io/writing/01/optimizing.webp)

## Then desperation

Now what? The first deadline felt brutal, but the last milestone is even harder. And for the love of Turing, I hope no new features come up along the way, right? ... Right? From building a somewhat stable benchmark to closing the remaining 10x, it feels impossible.

Of course, something that's already optimized can't get much faster, wouldn't you think? Hmm... actually, not really. You would be surprised, as I am every time I take a crack at a challenge, by how much of the software we write is extremely bad.

Here's the thing: the machine is absurdly fast. Billions of cycles per second, and a good chunk of them go to nothing useful. Things like waiting on memory, recomputing what didn't change, copying data just so the types line up, waiting for instructions, locking resources that shouldn't even be locked, allocating inside the hot loop, over and over. And the most ridiculous part: none of it shows up at the surface level, because all the code looks fine. And that's usually where the missing 10x, 100x, even 1000x is hiding.

Finding it is the hard part, and that's what the next articles are all about.

Until then... hang in there!

## Terminology

- **penetrate a market**: Get customers in a market that already has sellers. You take share from whoever is already there.
- **John Doerr**: A Kleiner Perkins partner. Early money in Google, Amazon, Netscape.
- **p99+**: The slow one percent, and worse. The mean can look fine the entire time these are happening.
- **OS jitter**: The kernel stopping your process for a bit: a timer, a schedule, another thread. The clock moved. Your function did not.
- **multimodal**: The latency is not one population. Any number of blobs, each a different path.

## Related writing

- [You're Paying for Someone Else's Problem](https://mgrazianoc.github.io/writing/02/)
