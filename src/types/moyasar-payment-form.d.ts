// moyasar-payment-form ships types its package.json "exports" doesn't expose.
declare module "moyasar-payment-form" {
  const Moyasar: { init(config: object): void; setAmount(amount: number): void };
  export default Moyasar;
}
